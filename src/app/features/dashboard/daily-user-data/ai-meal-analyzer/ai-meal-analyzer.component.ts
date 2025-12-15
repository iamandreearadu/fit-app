import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { MaterialModule } from '../../../../core/material/material.module';
import { CommonModule } from '@angular/common';
import { GroqAiFacade } from '../../../../core/facade/groq-ai.facade';
import { MealMacros } from '../../../../core/models/meal-macros';

@Component({
  selector: 'app-ai-meal-analyzer',
  standalone: true,
  imports: [CommonModule,MaterialModule],
  templateUrl: './ai-meal-analyzer.component.html',
  styleUrl: './ai-meal-analyzer.component.css'
})
export class AiMealAnalyzerComponent {
 private groq = inject(GroqAiFacade);

  @Input() disabled = false;
  @Input() maxSizeMB = 8;

  @Output() added = new EventEmitter<MealMacros>();
  @Output() analyzed = new EventEmitter<MealMacros>();
  @Output() error = new EventEmitter<string>();

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  file: File | null = null;
  preview: string | null = null;
  errorMsg: string | null = null;
  loading = false;
  isDragOver = false;
  result: MealMacros | null = null;

  openFileDialog(): void {
    this.fileInputRef?.nativeElement.click();
  }

  onFileChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    this.setFile(f);

    // allow same-file reselection
    if (input) input.value = '';
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
    this.isDragOver = true;
  }
  onDragLeave(ev: DragEvent) {
    ev.preventDefault();
    this.isDragOver = false;
  }
  onDrop(ev: DragEvent) {
    ev.preventDefault();
    this.isDragOver = false;
    const f = ev.dataTransfer?.files?.[0] ?? null;
    this.setFile(f);
  }

  private setFile(f: File | null) {
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
  }

  clear() {
    this.file = null;
    this.preview = null;
    this.errorMsg = null;
    this.result = null;
  }

  private fail(msg: string) {
    this.errorMsg = msg;
    this.error.emit(msg);
  }

  async analyze() {
    if (!this.file) { this.fail('No image selected.'); return; }
     this.loading = true;
    this.errorMsg = null;

    try {
      const res = await this.groq.analyzeMeal(this.file);
      // store locally for UI
          this.result = {
        protein_g: Number(res.protein_g ?? 0),
        carbs_g: Number(res.carbs_g ?? 0),
        fats_g: Number(res.fats_g ?? 0),
        calories_kcal: res.calories_kcal != null ? Number(res.calories_kcal) : undefined,
        items: res.items
      };
      // emit upward for daily-user-data accumulation

      this.analyzed.emit(this.result);
    } catch (e: any) {
      this.fail(e?.message || 'AI analysis failed.');
    }  finally {
      this.loading = false;
    }
  }

    addToUser() {
    if (!this.result) return;
    this.added.emit(this.result);
  }
}