import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../core/material/material.module';
import { ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NutritionTabFacade } from '../../../core/facade/nutrition-tab.facade';
import { FoodSearchResult, MealEntry, MealType, RecentFoodItem } from '../../../core/models/nutrition-tab.model';
import { AlertService } from '../../../shared/services/alert.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NutritionGuidedEmptyComponent } from './guided-empty/nutrition-guided-empty.component';
import { AiMealAnalyzerDialogComponent } from '../../dashboard/daily-user-data/ai-meal-analyzer/ai-meal-analyzer-dialog.component';
import { FoodSearchComponent } from './food-search/food-search.component';
import { RecentFoodsListComponent } from './recent-foods/recent-foods.component';
import { MealCompletionFeedbackComponent } from './meal-completion-feedback/meal-completion-feedback.component';

@Component({
  selector: 'app-nutrition-tab',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    NutritionGuidedEmptyComponent,
    FoodSearchComponent,
    RecentFoodsListComponent,
    MealCompletionFeedbackComponent,
  ],
  templateUrl: './nutrition-tab.component.html',
  styleUrl: './nutrition-tab.component.css',
})
export class NutritionTabComponent implements OnInit {

  readonly facade = inject(NutritionTabFacade);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly alerts = inject(AlertService);

  loading = false;
  meals: MealEntry[] = [];
  filtered: MealEntry[] = [];

  // Fix 3 — post-save feedback state
  readonly showFeedback = signal(false);
  readonly lastSavedMeal = signal<MealEntry | null>(null);

  searchTerm = '';
  selectedType: 'all' | MealType = 'all';
  types: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout', 'Other'];

  expandedUid: string | null = null;
  showEditor = false;
  editing = false;

  form = this.fb.group({
    uid: this.fb.control<string | null>(null),
    name: this.fb.control<string>('', [Validators.required, Validators.minLength(2)]),
    type: this.fb.control<MealType>('Breakfast', { nonNullable: true }),
    date: this.fb.control<string>(new Date().toISOString().slice(0, 10), [Validators.required]),
    notes: this.fb.control<string>(''),
    items: this.fb.array<FormGroup>([]),
  });

  // Fix 1 — per-item USDA scaling state (WeakMap keyed by FormGroup reference)
  private baseMap = new WeakMap<FormGroup, { cal: number; p: number; c: number; f: number } | null>();
  private subscribedGroups = new WeakSet<FormGroup>();
  /** Emitting resets all scaling/macro subscriptions when the modal reopens. */
  private readonly resetSubs$ = new Subject<void>();

  ngOnInit(): void {
    this.facade.meals$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(m => {
      this.meals = m ?? [];
      this.applyFilters();
    });

    this.loading = true;
    this.facade.loadMeals().finally(() => (this.loading = false));

    // Fix 1 — pre-load recent foods so the @if guard fires immediately
    this.facade.loadRecentFoods();
  }

  get items(): FormArray<FormGroup> {
    return this.form.controls.items as FormArray<FormGroup>;
  }

  private buildItemGroup(): FormGroup {
    return this.fb.group({
      name:      this.fb.control<string>('',   [Validators.required]),
      grams:     this.fb.control<number>(100,  [Validators.required, Validators.min(0)]),
      calories:  this.fb.control<number>(0,    [Validators.required, Validators.min(0)]),
      protein_g: this.fb.control<number>(0,    [Validators.required, Validators.min(0)]),
      carbs_g:   this.fb.control<number>(0,    [Validators.required, Validators.min(0)]),
      fats_g:    this.fb.control<number>(0,    [Validators.required, Validators.min(0)]),
      source:    this.fb.control<string | null>(null),   // Fix 1: track data origin
    });
  }

  /** Sets up valueChanges listeners so manual macro edits clear the USDA scaling base. */
  private setupMacroListeners(group: FormGroup): void {
    (['calories', 'protein_g', 'carbs_g', 'fats_g'] as const).forEach(field => {
      group.get(field)!.valueChanges.pipe(
        takeUntil(this.resetSubs$),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(() => {
        // Any user-initiated change to a macro field disables USDA auto-scaling for that item
        this.baseMap.set(group, null);
      });
    });
  }

  /** Subscribes to grams control changes to scale macros proportionally from the USDA base. */
  private setupGramsScaling(group: FormGroup): void {
    if (this.subscribedGroups.has(group)) return; // prevent duplicate subscription
    this.subscribedGroups.add(group);

    group.get('grams')!.valueChanges.pipe(
      takeUntil(this.resetSubs$),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(newGrams => {
      const base = this.baseMap.get(group);
      if (!base || newGrams == null) return;
      const factor = Number(newGrams) / 100;
      // emitEvent: false → prevents macro valueChanges from firing → preserves the base
      group.patchValue({
        calories:  +(base.cal * factor).toFixed(1),
        protein_g: +(base.p   * factor).toFixed(1),
        carbs_g:   +(base.c   * factor).toFixed(1),
        fats_g:    +(base.f   * factor).toFixed(1),
      }, { emitEvent: false });
    });
  }

  addItem(): void {
    const newGroup = this.buildItemGroup();
    this.items.push(newGroup);
    this.setupMacroListeners(newGroup);
  }

  removeItem(i: number): void {
    this.items.removeAt(i);
  }

  get mealTotals() {
    const vals = this.items.value as any[];
    return vals.reduce(
      (acc, item) => ({
        grams:     acc.grams     + Number(item.grams     ?? 0),
        calories:  acc.calories  + Number(item.calories  ?? 0),
        protein_g: acc.protein_g + Number(item.protein_g ?? 0),
        carbs_g:   acc.carbs_g   + Number(item.carbs_g   ?? 0),
        fats_g:    acc.fats_g    + Number(item.fats_g    ?? 0),
      }),
      { grams: 0, calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 }
    );
  }

  applyFilters(): void {
    let list = this.meals;
    const term = this.searchTerm.trim().toLowerCase();
    if (term) list = list.filter(m => m.name.toLowerCase().includes(term) || m.type.toLowerCase().includes(term));
    if (this.selectedType !== 'all') list = list.filter(m => m.type === this.selectedType);
    this.filtered = list;
  }

  isExpanded(m: MealEntry): boolean {
    return this.expandedUid === (m.uid ?? String(m.id));
  }

  togglePreview(m: MealEntry): void {
    const key = m.uid ?? String(m.id);
    this.expandedUid = this.expandedUid === key ? null : key;
  }

  openCreate(): void {
    this.editing = false;
    // Cancel any in-flight scaling subscriptions from a previous modal session
    this.resetSubs$.next();
    this.baseMap = new WeakMap();
    this.subscribedGroups = new WeakSet();
    this.items.clear();
    this.form.reset({
      uid: null,
      name: '',
      type: 'Breakfast',
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    this.addItem();
    this.facade.loadRecentFoods();
    this.showEditor = true;
  }

  openEdit(m: MealEntry): void {
    this.editing = true;
    // Cancel any in-flight scaling subscriptions from a previous modal session
    this.resetSubs$.next();
    this.baseMap = new WeakMap();
    this.subscribedGroups = new WeakSet();
    this.items.clear();
    this.form.patchValue({
      uid:   m.uid ?? null,
      name:  m.name,
      type:  m.type,
      date:  m.date,
      notes: m.notes ?? '',
    });
    (m.items ?? []).forEach(item => {
      const g = this.buildItemGroup();
      g.patchValue(item, { emitEvent: false });
      this.items.push(g);
      this.setupMacroListeners(g);
    });
    if (this.items.length === 0) this.addItem();
    this.facade.loadRecentFoods();
    this.showEditor = true;
  }

  cancel(): void {
    this.showEditor = false;
    // clearSearch() removed — FoodSearchComponent instances are destroyed
    // by @if (showEditor) when the modal closes;
    // no facade-level state to clear.
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const saved = await this.facade.saveMeal({
      uid:   raw.uid ?? undefined,
      name:  raw.name ?? '',
      type:  raw.type,
      date:  raw.date ?? new Date().toISOString().slice(0, 10),
      notes: raw.notes ?? '',
      items: (raw.items as any[]).map(i => ({
        name:      i.name,
        grams:     Number(i.grams),
        calories:  Number(i.calories),
        protein_g: Number(i.protein_g),
        carbs_g:   Number(i.carbs_g),
        fats_g:    Number(i.fats_g),
        source:    i.source ?? null,   // Fix 1: pass through data origin
      })),
    });
    this.cancel();

    // Fix 3 — show feedback immediately; bars animate reactively when macro data arrives
    if (saved) {
      this.lastSavedMeal.set(saved);
      this.showFeedback.set(true);
      await this.facade.refreshMacroProgress();
    }
  }

  /** Fix 3 — called when MealCompletionFeedbackComponent emits (dismissed). */
  onFeedbackDismissed(): void {
    this.showFeedback.set(false);
    this.lastSavedMeal.set(null);
  }

  async deleteMeal(uid?: string): Promise<void> {
    if (!uid) return;
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: { message: 'Delete this meal?', dangerous: true },
        panelClass: 'confirm-dialog-panel',
        maxWidth: '360px',
        width: '100%',
      }).afterClosed()
    );
    if (!confirmed) return;
    try {
      await this.facade.deleteMeal(uid);
      this.alerts.success('Meal deleted.');
    } catch {
      this.alerts.error('Failed to delete meal.');
    }
  }

  stop(e: Event): void { e.stopPropagation(); }

  // ── Fix 1 handlers ────────────────────────────────────────────────────────

  /**
   * Called when FoodSearchComponent emits a USDA result.
   * Patches the item form group and sets up grams → macro scaling.
   */
  onFoodSelected(result: FoodSearchResult, index: number): void {
    const group = this.items.at(index);
    // Store per-100g base for proportional scaling
    this.baseMap.set(group, {
      cal: result.calories,
      p:   result.protein_g,
      c:   result.carbs_g,
      f:   result.fat_g,
    });
    // Patch without emitting events so macro listeners don't clear the base prematurely
    group.patchValue({
      name:      result.name,
      grams:     100,
      calories:  +result.calories.toFixed(1),
      protein_g: +result.protein_g.toFixed(1),
      carbs_g:   +result.carbs_g.toFixed(1),
      fats_g:    +result.fat_g.toFixed(1),
      source:    'search',
    }, { emitEvent: false });
    // Wire grams → scaling (once per group reference)
    this.setupGramsScaling(group);
  }

  /**
   * Called when the user taps a recent-food chip.
   * Appends a new food item card pre-filled with the last-used values.
   */
  onRecentFoodSelected(item: RecentFoodItem): void {
    this.addItem();
    const group = this.items.at(this.items.length - 1);
    // Recent foods use gram-scaled values directly — no USDA base scaling
    group.patchValue({
      name:      item.name,
      grams:     item.grams,
      calories:  item.calories,
      protein_g: item.protein_g,
      carbs_g:   item.carbs_g,
      fats_g:    item.fats_g,
      source:    'recent',
    }, { emitEvent: false });
  }

  /**
   * Called by FoodSearchComponent on every keystroke (manual / free-text mode).
   * Keeps the form's `name` control in sync without emitting further events.
   */
  onNameChange(name: string, index: number): void {
    const group = this.items.at(index);
    group.get('name')!.setValue(name, { emitEvent: false });
    const currentSource = group.get('source')!.value;
    if (!currentSource || currentSource === 'search') {
      group.get('source')!.setValue('manual', { emitEvent: false });
    }
  }

  /**
   * Called when the user clicks "Enter manually" in FoodSearchComponent.
   * FoodSearchComponent closes its dropdown; we set source to 'manual'.
   */
  onManualMode(index: number): void {
    const group = this.items.at(index);
    group.get('source')!.setValue('manual', { emitEvent: false });
  }

  /**
   * Fix 7: Opens the AI Meal Analyzer inline as a MatDialog — zero navigation,
   * zero activation energy. On save, the meal list reloads automatically.
   */
  onOpenAiAnalyzer(): void {
    this.dialog
      .open(AiMealAnalyzerDialogComponent, {
        panelClass: 'ai-analyzer-panel',
        maxWidth: window.innerWidth <= 640 ? '100vw' : '560px',
        width: '100%',
      })
      .afterClosed()
      .subscribe((mealSaved: boolean) => {
        if (mealSaved) this.facade.loadMeals();
      });
  }
}
