import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  NgZone,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../core/material/material.module';
import { GroqAiFacade } from '../../../../core/facade/groq-ai.facade';
import { MealMacros } from '../../../../core/models/meal-macros';
import { MealType } from '../../../../core/models/nutrition-tab.model';
import { BarcodeProduct } from '../../../../core/models/barcode-product.model';
import { BrowserMultiFormatReader } from '@zxing/browser';

type AnalyzerMode = 'photo' | 'barcode';

@Component({
  selector: 'app-ai-meal-analyzer',
  standalone: true,
  imports: [DecimalPipe, MaterialModule, FormsModule],
  templateUrl: './ai-meal-analyzer.component.html',
  styleUrl: './ai-meal-analyzer.component.css',
})
export class AiMealAnalyzerComponent implements OnDestroy {
  private groqFacade = inject(GroqAiFacade);
  private ngZone = inject(NgZone);

  @Input() disabled = false;
  @Input() maxSizeMB = 8;

  @Output() added = new EventEmitter<MealMacros>();
  @Output() analyzed = new EventEmitter<MealMacros>();
  @Output() error = new EventEmitter<string>();
  @Output() saveMeal = new EventEmitter<{ macros: MealMacros; mealType: MealType }>();

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  @ViewChild('scannerVideo') set scannerVideoRef(el: ElementRef<HTMLVideoElement> | undefined) {
    if (el?.nativeElement && this.scanning && !this.scannerStarted) {
      this.scannerStarted = true;
      void this.initScanner(el.nativeElement);
    }
  }

  // ── Mode ──────────────────────────────────────────────────────
  mode: AnalyzerMode = 'photo';

  // ── Photo state ───────────────────────────────────────────────
  file: File | null = null;
  preview: string | null = null;
  loading = false;
  isDragOver = false;

  // ── Barcode state ─────────────────────────────────────────────
  scanning = false;
  barcodeLoading = false;
  manualBarcode = '';
  product: BarcodeProduct | null = null;
  servingG = 100;

  private readonly codeReader = new BrowserMultiFormatReader();
  private scannerControls: { stop: () => void } | null = null;
  private scannerStarted = false;

  // ── Shared state ──────────────────────────────────────────────
  result: MealMacros | null = null;
  errorMsg: string | null = null;
  saving = false;

  selectedMealType: MealType = 'Other';
  readonly mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout', 'Other'];

  ngOnDestroy(): void {
    this.stopScanning();
  }

  setMode(m: AnalyzerMode): void {
    if (this.mode === m) return;
    this.stopScanning();
    this.mode = m;
    this.errorMsg = null;
    this.result = null;
    this.saving = false;
    if (m === 'photo') {
      this.product = null;
      this.manualBarcode = '';
    } else {
      this.file = null;
      this.preview = null;
    }
  }

  // ── Photo mode ────────────────────────────────────────────────

  openFileDialog(): void {
    this.fileInputRef?.nativeElement.click();
  }

  onFileChange(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.setFile(input.files?.[0] ?? null);
    if (input) input.value = '';
  }

  onDragOver(ev: DragEvent): void { ev.preventDefault(); this.isDragOver = true; }
  onDragLeave(ev: DragEvent): void { ev.preventDefault(); this.isDragOver = false; }
  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragOver = false;
    this.setFile(ev.dataTransfer?.files?.[0] ?? null);
  }

  private setFile(f: File | null): void {
    this.errorMsg = null;
    this.file = null;
    this.preview = null;
    this.result = null;
    if (!f) return;
    if (!f.type.startsWith('image/')) { this.fail('Please upload an image.'); return; }
    if (f.size > this.maxSizeMB * 1024 * 1024) { this.fail(`Image exceeds ${this.maxSizeMB}MB.`); return; }
    this.file = f;
    const r = new FileReader();
    r.onload = () => this.preview = String(r.result);
    r.readAsDataURL(f);
    void this.analyze();
  }

  async analyze(): Promise<void> {
    if (!this.file) { this.fail('No image selected.'); return; }
    this.loading = true;
    this.errorMsg = null;
    try {
      const res = await this.groqFacade.analyzeMeal(this.file);
      this.result = {
        protein_g: Number(res.protein_g ?? 0),
        carbs_g: Number(res.carbs_g ?? 0),
        fats_g: Number(res.fats_g ?? 0),
        calories_kcal: res.calories_kcal != null ? Number(res.calories_kcal) : undefined,
        items: res.items,
      };
      this.analyzed.emit(this.result);
    } catch (e: unknown) {
      const err = e as { message?: string };
      this.fail(err?.message || 'AI analysis failed.');
    } finally {
      this.loading = false;
    }
  }

  // ── Barcode mode ──────────────────────────────────────────────

  startScanning(): void {
    this.errorMsg = null;
    this.scanning = true;
    this.scannerStarted = false;
    // The @ViewChild setter fires when <video #scannerVideo> enters the DOM
  }

  private async initScanner(videoEl: HTMLVideoElement): Promise<void> {
    let handled = false;
    try {
      this.scannerControls = await this.codeReader.decodeFromVideoDevice(
        undefined,
        videoEl,
        (result) => {
          if (result && !handled) {
            handled = true;
            this.scannerControls?.stop();
            this.ngZone.run(() => {
              this.scanning = false;
              this.scannerControls = null;
              void this.lookupBarcode(result.getText());
            });
          }
        },
      );
    } catch {
      this.ngZone.run(() => {
        this.fail('Camera access denied or unavailable.');
        this.scanning = false;
      });
    }
  }

  stopScanning(): void {
    this.scannerControls?.stop();
    this.scannerControls = null;
    this.scanning = false;
    this.scannerStarted = false;
  }

  async lookupBarcode(barcode: string): Promise<void> {
    if (!barcode.trim()) return;
    this.barcodeLoading = true;
    this.errorMsg = null;
    try {
      this.product = await this.groqFacade.lookupBarcode(barcode.trim());
      this.servingG = this.product.servingSizeG;
      this.result = this.buildMacrosFromProduct(this.product, this.servingG);
      this.analyzed.emit(this.result);
    } catch (e: unknown) {
      const err = e as { message?: string };
      this.fail(err?.message || 'Product not found.');
    } finally {
      this.barcodeLoading = false;
    }
  }

  onServingChange(): void {
    if (this.product && this.servingG > 0) {
      this.result = this.buildMacrosFromProduct(this.product, this.servingG);
    }
  }

  private buildMacrosFromProduct(p: BarcodeProduct, g: number): MealMacros {
    const ratio = g / 100;
    return {
      protein_g: Math.round(p.macrosPer100g.protein_g * ratio * 10) / 10,
      carbs_g: Math.round(p.macrosPer100g.carbs_g * ratio * 10) / 10,
      fats_g: Math.round(p.macrosPer100g.fats_g * ratio * 10) / 10,
      calories_kcal: Math.round(p.macrosPer100g.calories_kcal * ratio),
      items: [{ name: p.name }],
    };
  }

  clearBarcode(): void {
    this.product = null;
    this.result = null;
    this.manualBarcode = '';
    this.errorMsg = null;
    this.saving = false;
    this.selectedMealType = 'Other';
  }

  // ── Shared ────────────────────────────────────────────────────

  clear(): void {
    this.file = null;
    this.preview = null;
    this.errorMsg = null;
    this.result = null;
    this.saving = false;
    this.selectedMealType = 'Other';
  }

  addToUser(): void {
    if (!this.result) return;
    this.added.emit(this.result);
  }

  saveToNutrition(): void {
    if (!this.result || this.saving) return;
    this.saving = true;
    this.saveMeal.emit({ macros: this.result, mealType: this.selectedMealType });
  }

  private fail(msg: string): void {
    this.errorMsg = msg;
    this.error.emit(msg);
  }

  // ── Quality display helpers ───────────────────────────────────

  qualityColor(score: number): string {
    if (score >= 8) return '#4caf50';
    if (score >= 5) return '#ff9800';
    return '#f44336';
  }

  nutriScoreBg(grade: string): string {
    const map: Record<string, string> = {
      A: '#1a7c4e', B: '#85bb2f', C: '#f7c623', D: '#e5872a', E: '#e63e11',
    };
    return map[grade] ?? '#888';
  }
}
