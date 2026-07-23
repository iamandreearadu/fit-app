import { Component, inject, OnInit, effect, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserFacade } from '../../../core/facade/user.facade';
import { DailyUserData } from '../../../core/models/daily-user-data.model';
import { MaterialModule } from '../../../core/material/material.module';
import { GroqAiFacade } from '../../../core/facade/groq-ai.facade';
import { MealMacros } from '../../../core/models/meal-macros';
import { AiMealAnalyzerComponent } from './ai-meal-analyzer/ai-meal-analyzer.component';
import { CalorieBalanceCardComponent } from '../calorie-balance-card/calorie-balance-card.component';
import { AlertService } from '../../../shared/services/alert.service';
import { MealEntry, MealType } from '../../../core/models/nutrition-tab.model';

import { from, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PushOptInComponent } from '../../../shared/components/push-opt-in/push-opt-in.component';
import { NotificationFacade } from '../../../core/facade/notification.facade';

@Component({
  standalone: true,
  selector: 'app-daily-user-data',
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, MaterialModule, AiMealAnalyzerComponent, CalorieBalanceCardComponent, PushOptInComponent],
  host: { class: 'd-block' },
  templateUrl: './daily-user-data.component.html',
  styleUrls: ['./daily-user-data.component.css']
})
export class DailyUserDataComponent implements OnInit {

  public form: FormGroup;

  protected readonly facade = inject(UserFacade);
  protected readonly groqFacade = inject(GroqAiFacade);
  protected readonly alerts = inject(AlertService);
  protected readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationFacade);

  protected readonly history = this.facade.history;

  public showAnalyzeOverlay = false;
  public showMealsOverlay = false;
  public showSavedMeals = false;
  public analyzeError: string | null = null;
  public showActivityPicker = false;
  public showCalorieBalance = false;

  public showMealPicker = false;
  public readonly mealPickerSearch = signal('');
  public mealPickerLoading = false;
  public lastAppliedMeal: MealEntry | null = null;

  public readonly mealTypes: readonly MealType[] = [
    'Breakfast',
    'Lunch',
    'Dinner',
    'Snack',
    'Pre-workout',
    'Post-workout',
    'Other',
  ];
  public readonly expandedMealTypes = signal<ReadonlySet<MealType>>(new Set<MealType>());
  public readonly selectedSavedMeal = signal<MealEntry | null>(null);
  public readonly selectedSavedMealType = signal<MealType>('Breakfast');
  public readonly mealActionId = signal<string | null>(null);
  public showManualMacrosOverlay = false;
  public manualMacrosSaving = false;
  public manualMealSaving = false;
  public readonly manualMacrosForm = this.fb.group({
    name: this.fb.control('Manual entry', [Validators.required, Validators.maxLength(80)]),
    type: this.fb.control<MealType>('Breakfast', { nonNullable: true }),
    protein: this.fb.control(0, [Validators.required, Validators.min(0)]),
    carbs: this.fb.control(0, [Validators.required, Validators.min(0)]),
    fats: this.fb.control(0, [Validators.required, Validators.min(0)]),
  });

  public readonly todayMeals = computed(() =>
    this.facade.meals().filter(meal =>
      !meal.isSavedMeal && String(meal.date).slice(0, 10) === this.facade.todayDate
    )
  );

  public readonly todayMealGroups = computed(() =>
    this.mealTypes.map(type => {
      const meals = this.todayMeals().filter(meal => meal.type === type);
      return {
        type,
        meals,
        calories: meals.reduce((sum, meal) => sum + Number(meal.totalCalories || 0), 0),
      };
    }).filter(group => group.meals.length > 0)
  );

  public readonly savedMeals = computed(() => {
    const today = this.facade.todayDate;
    const seen = new Set<string>();
    return this.facade.meals().filter(meal => {
      if (!meal.isSavedMeal) return false;
      const key = `${meal.name.trim().toLowerCase()}|${meal.totalCalories}|${meal.totalProtein_g}|${meal.totalCarbs_g}|${meal.totalFats_g}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  public readonly todayMealsCalories = computed(() =>
    this.todayMeals().reduce((sum, meal) => sum + Number(meal.totalCalories || 0), 0)
  );

  public readonly filteredPickerMeals = computed<MealEntry[]>(() => {
    const term = this.mealPickerSearch().trim().toLowerCase();
    if (!term) return this.facade.meals();
    return this.facade.meals().filter(m =>
      m.name.toLowerCase().includes(term) || m.type.toLowerCase().includes(term)
    );
  });


  public readonly activityOptions = [
    { value: 'strength-training', label: 'Strength Training', icon: 'fitness_center' },
    { value: 'cardio',            label: 'Cardio',            icon: 'directions_run' },
    { value: 'hiit-training',     label: 'HIIT Training',     icon: 'flash_on' },
    { value: 'active-rest-day',   label: 'Active Rest Day',   icon: 'self_improvement' },
    { value: 'rest-day',          label: 'Rest Day',          icon: 'bedtime' },
  ];

  public get currentActivityDisplay(): { label: string; icon: string } {
    const val = this.form.get('activityType')?.value ?? '';
    const found = this.activityOptions.find(o => o.value === val);
    if (found) return found;
    if (val.startsWith('workout:')) {
      const uid = val.replace('workout:', '');
      const t = this.facade.workoutTemplates().find(t => t.uid === uid);
      if (t) return { label: t.title, icon: 'sports' };
    }
    return { label: 'Select activity', icon: 'bolt' };
  }

  public selectActivity(value: string): void {
    this.form.get('activityType')?.setValue(value);
    this.form.markAsDirty();
    this.showActivityPicker = false;
  }

  public autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  private isPatchingFromBackend = false;
  private lastSavedSerialized: string | null = null;
  private dailyCompletionCelebrated = false;

  constructor() {
    this.form = this.buildForm();
    this.setupDailyEffect();
    this.setupAutoSave();
    this.setupWorkoutAutoFill();
    this.setupCaloriesBurnedLiveSync();
  }

  ngOnInit(): void {
    // Load all data in parallel — avoids sequential waterfall
    Promise.all([
      this.facade.loadDaily(),
      this.facade.loadTodaySummary(),
      this.facade.loadWorkoutTemplates(),
    ]).then(() => this.syncMacrosFromNutritionSummary());
  }

  openMealAnalyze(): void {
    this.analyzeError = null;
    this.showAnalyzeOverlay = true;
  }

  closeMealAnalyze(): void {
    this.showAnalyzeOverlay = false;
  }

  openManualMacros(): void {
    this.manualMacrosForm.reset({
      name: 'Manual entry',
      type: 'Breakfast',
      protein: 0,
      carbs: 0,
      fats: 0,
    });
    this.showManualMacrosOverlay = true;
  }

  closeManualMacros(): void {
    if (this.manualMacrosSaving || this.manualMealSaving) return;
    this.showManualMacrosOverlay = false;
  }

  async saveManualMacros(): Promise<void> {
    if (this.manualMacrosForm.invalid || this.manualMacrosSaving) {
      this.manualMacrosForm.markAllAsTouched();
      return;
    }
    const value = this.manualMacrosForm.getRawValue();
    const protein = Number(value.protein || 0);
    const carbs = Number(value.carbs || 0);
    const fats = Number(value.fats || 0);
    if (protein + carbs + fats <= 0) {
      this.alerts.error('Add at least one macro value.');
      return;
    }

    this.manualMacrosSaving = true;
    try {
      const saved = await this.facade.saveMeal(this.buildManualMealPayload(false));
      if (!saved) {
        this.alerts.error('Failed to add macros. Please try again.');
        return;
      }
      await this.facade.loadTodaySummary();
      this.syncMacrosFromNutritionSummary();
      this.showManualMacrosOverlay = false;
      this.alerts.success('Manual macros added to today.');
    } finally {
      this.manualMacrosSaving = false;
    }
  }

  async saveManualMeal(): Promise<void> {
    if (!this.validateManualMeal() || this.manualMealSaving) return;
    this.manualMealSaving = true;
    try {
      const saved = await this.facade.saveMeal(this.buildManualMealPayload(true));
      if (!saved) {
        this.alerts.error('Failed to save meal. Please try again.');
        return;
      }
      this.alerts.success('Meal saved to Account → Nutrition.');
      // Intentionally keep the modal and its values open so the same meal can
      // also be logged for today with the primary action.
    } finally {
      this.manualMealSaving = false;
    }
  }

  private validateManualMeal(): boolean {
    if (this.manualMacrosForm.invalid) {
      this.manualMacrosForm.markAllAsTouched();
      return false;
    }
    const value = this.manualMacrosForm.getRawValue();
    if (Number(value.protein || 0) + Number(value.carbs || 0) + Number(value.fats || 0) <= 0) {
      this.alerts.error('Add at least one macro value.');
      return false;
    }
    return true;
  }

  private buildManualMealPayload(isSavedMeal: boolean): Partial<MealEntry> {
    const value = this.manualMacrosForm.getRawValue();
    const name = value.name?.trim() || 'Manual entry';
    const protein = Number(value.protein || 0);
    const carbs = Number(value.carbs || 0);
    const fats = Number(value.fats || 0);
    return {
      name,
      type: value.type,
      date: this.facade.todayDate,
      isSavedMeal,
      items: [{
        name,
        grams: 0,
        calories: Math.round((protein * 4 + carbs * 4 + fats * 9) * 10) / 10,
        protein_g: protein,
        carbs_g: carbs,
        fats_g: fats,
        source: 'manual',
      }],
    };
  }

  async openMeals(): Promise<void> {
    this.showMealsOverlay = true;
    this.showSavedMeals = false;
    this.selectedSavedMeal.set(null);
    await this.facade.loadMeals();
    await this.facade.loadSavedMeals();
    this.expandedMealTypes.set(new Set(
      this.todayMealGroups()
        .filter(group => group.meals.length > 0)
        .map(group => group.type)
    ));
  }

  closeMeals(): void {
    this.showMealsOverlay = false;
    this.showSavedMeals = false;
  }

  openSavedMeals(): void {
    this.selectedSavedMeal.set(null);
    this.selectedSavedMealType.set('Breakfast');
    this.showSavedMeals = true;
  }

  closeSavedMeals(): void {
    this.showSavedMeals = false;
    this.selectedSavedMeal.set(null);
  }

  async addSavedMeal(): Promise<void> {
    const meal = this.selectedSavedMeal();
    if (!meal || this.mealActionId()) return;
    this.mealActionId.set(`add:${meal.uid ?? meal.id}`);
    try {
      const saved = await this.facade.saveMeal({
        name: meal.name,
        type: this.selectedSavedMealType(),
        date: this.facade.todayDate,
        notes: meal.notes,
        isSavedMeal: false,
        items: meal.items.map(item => ({ ...item })),
      });
      if (!saved) {
        this.alerts.error('Failed to add saved meal. Please try again.');
        return;
      }
      this.expandedMealTypes.update(types => new Set(types).add(this.selectedSavedMealType()));
      this.closeSavedMeals();
      await this.facade.loadTodaySummary();
      this.syncMacrosFromNutritionSummary();
      this.alerts.success('Saved meal added to today.');
    } finally {
      this.mealActionId.set(null);
    }
  }

  async deleteTodayMeal(meal: MealEntry): Promise<void> {
    const id = meal.uid ?? String(meal.id);
    if (!id || this.mealActionId()) return;
    this.mealActionId.set(`delete:${id}`);
    try {
      const deleted = await this.facade.deleteMeal(id);
      if (deleted) {
        await this.facade.loadTodaySummary();
        this.syncMacrosFromNutritionSummary();
      }
    } finally {
      this.mealActionId.set(null);
    }
  }

  toggleMealGroup(type: MealType): void {
    const next = new Set(this.expandedMealTypes());
    if (next.has(type)) next.delete(type);
    else next.add(type);
    this.expandedMealTypes.set(next);
  }

  openCalorieBalance(): void {
    this.showCalorieBalance = true;
  }

  closeCalorieBalance(): void {
    this.showCalorieBalance = false;
  }

  async openMealPicker(): Promise<void> {
    this.mealPickerSearch.set('');
    this.showMealPicker = true;
    this.mealPickerLoading = true;
    await this.facade.loadMeals();
    this.mealPickerLoading = false;
  }

  closeMealPicker(): void {
    this.showMealPicker = false;
  }

  async selectMeal(meal: MealEntry): Promise<void> {
    const saved = await this.facade.saveMeal({
      name: meal.name,
      type: meal.type,
      date: this.facade.todayDate,
      notes: meal.notes,
      items: meal.items.map(item => ({ ...item })),
    });
    if (!saved) {
      this.alerts.error('Failed to add saved meal. Please try again.');
      return;
    }
    this.lastAppliedMeal = saved;
    await this.facade.loadTodaySummary();
    this.syncMacrosFromNutritionSummary();
    this.closeMealPicker();
  }

  async undoLastMeal(): Promise<void> {
    if (!this.lastAppliedMeal) return;
    const id = this.lastAppliedMeal.uid ?? String(this.lastAppliedMeal.id);
    const deleted = await this.facade.deleteMeal(id);
    if (!deleted) return;
    this.lastAppliedMeal = null;
    await this.facade.loadTodaySummary();
    this.syncMacrosFromNutritionSummary();
  }

  async onAnalyzerAdded(event: { macros: MealMacros; mealType: MealType }): Promise<void> {
    const saved = await this.persistAnalyzedMeal(event);
    if (!saved) return;
    await this.facade.loadTodaySummary();
    this.syncMacrosFromNutritionSummary();
    this.alerts.success('Meal added to today.');
    this.closeMealAnalyze();
  }

  onAnalyzerError(msg: string): void {
    this.analyzeError = msg || 'Analysis failed.';
    this.alerts.error('Macros analysis failed.');
  }

  async onAnalyzerSaveMeal(event: { macros: MealMacros; mealType: MealType }): Promise<void> {
    const saved = await this.persistAnalyzedMeal(event);
    if (!saved) return;
    await this.facade.loadTodaySummary();
    this.syncMacrosFromNutritionSummary();
    this.alerts.success('Meal saved to nutrition log.');
    this.closeMealAnalyze();
  }

  private async persistAnalyzedMeal(event: { macros: MealMacros; mealType: MealType }): Promise<boolean> {
    const { macros, mealType } = event;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });
    const items = macros.items && macros.items.length > 0
      ? macros.items.map(it => ({
          name: it.name,
          grams: 0,
          calories: it.calories_kcal ?? 0,
          protein_g: it.protein_g ?? 0,
          carbs_g: it.carbs_g ?? 0,
          fats_g: it.fats_g ?? 0,
        }))
      : [{
          name: 'Mixed meal',
          grams: 0,
          calories: macros.calories_kcal ?? 0,
          protein_g: macros.protein_g,
          carbs_g: macros.carbs_g,
          fats_g: macros.fats_g,
        }];

    try {
      const saved = await this.facade.saveMeal({
        name: `AI Meal ${timeStr}`,
        type: mealType,
        date: this.facade.todayDate,
        items,
      });
      if (!saved) {
        this.alerts.error('Failed to save meal. Please try again.');
        return false;
      }
      return true;
    } catch {
      this.alerts.error('Failed to save meal. Please try again.');
      return false;
    }
  }



  // ===================== AUTOSAVE =====================

  
 private setupAutoSave(): void {
    this.form.valueChanges.pipe(
      takeUntilDestroyed(),
      filter(() => !this.isPatchingFromBackend),
      debounceTime(1200),
      filter(() => this.form.valid),
      map(() => {
        const patch = this.form.getRawValue() as Partial<DailyUserData>;
        return { patch, serialized: JSON.stringify(patch) };
      }),
      distinctUntilChanged((a, b) => a.serialized === b.serialized),
      filter(({ serialized }) => serialized !== this.lastSavedSerialized),
      tap(({ serialized }) => {
        this.lastSavedSerialized = serialized;
        this.autoSaveStatus = 'saving';
      }),
      switchMap(({ patch }) =>
        from(this.facade.saveDaily(patch)).pipe(
          tap(() => {
            this.autoSaveStatus = 'saved';
            this.form.markAsPristine();
            this.celebrateDailyCompletion();
            this.notifications.offerPushAfterDailyCheckIn();
          }),
          catchError(err => {
            this.lastSavedSerialized = null;
            this.autoSaveStatus = 'error';
            console.error('Autosave failed', err);
            return of(null);
          })
        )
      )
    ).subscribe();
  }


   // ===================== WORKOUT AUTO-FILL =====================

  private setupWorkoutAutoFill(): void {
    this.form.get('activityType')?.valueChanges.pipe(
      takeUntilDestroyed(),
      filter(() => !this.isPatchingFromBackend),
      filter((v): v is string => typeof v === 'string' && v.startsWith('workout:'))
    ).subscribe(value => {
      const uid = value.replace('workout:', '');
      const template = this.facade.workoutTemplates().find(t => t.uid === uid);
      if (template && template.caloriesEstimateKcal > 0) {
        this.form.get('caloriesBurned')?.setValue(template.caloriesEstimateKcal);
        this.form.markAsDirty();
      }
    });
  }

  private applyMealToForm(meal: MealMacros) {
    const macros = this.form.get('macrosPct') as FormGroup;
    const currProtein = Number(macros.get('protein')?.value ?? 0);
    const currCarbs   = Number(macros.get('carbs')?.value ?? 0);
    const currFats    = Number(macros.get('fats')?.value ?? 0);

    const nextProtein = Math.max(0, Math.round(currProtein + (meal.protein_g || 0)));
    const nextCarbs   = Math.max(0, Math.round(currCarbs   + (meal.carbs_g   || 0)));
    const nextFats    = Math.max(0, Math.round(currFats    + (meal.fats_g    || 0)));

    macros.patchValue({
      protein: nextProtein,
      carbs: nextCarbs,
      fats: nextFats
    });
    // caloriesIntake no longer mutated here — now server-computed from MealEntries (Fix 10)
    this.form.markAsDirty();
  }

  private removeMealFromForm(meal: MealEntry): void {
    const macros = this.form.get('macrosPct') as FormGroup;
    macros.patchValue({
      protein: Math.max(0, Math.round(Number(macros.get('protein')?.value ?? 0) - Number(meal.totalProtein_g || 0))),
      carbs: Math.max(0, Math.round(Number(macros.get('carbs')?.value ?? 0) - Number(meal.totalCarbs_g || 0))),
      fats: Math.max(0, Math.round(Number(macros.get('fats')?.value ?? 0) - Number(meal.totalFats_g || 0))),
    });
    this.form.markAsDirty();
  }

  private syncMacrosFromNutritionSummary(): void {
    const summary = this.facade.todaySummary();
    if (!summary) return;
    const macros = this.form.get('macrosPct') as FormGroup;
    macros.patchValue({
      protein: this.oneDecimal(summary.proteinFromNutritionLog_g),
      carbs: this.oneDecimal(summary.carbsFromNutritionLog_g),
      fats: this.oneDecimal(summary.fatsFromNutritionLog_g),
    }, { emitEvent: false });
  }

  private oneDecimal(value: number): number {
    return Math.round(Number(value || 0) * 10) / 10;
  }

  public adjustWaterMl(deltaMl: number): void {
    const ctrl = this.form.get('waterConsumedL');
    if (!ctrl) return;
    const current = Number(ctrl.value ?? 0);
    const next = Math.max(0, +(current + deltaMl / 1000).toFixed(3));
    ctrl.setValue(next);
    this.form.markAsDirty();
    this.facade.addWater(deltaMl / 1000); // actualizare imediata UI 
  }

  public adjustSteps(delta: number): void {
    const ctrl = this.form.get('steps');
    if (!ctrl) return;
    const current = Number(ctrl.value ?? 0);
    const next = Math.max(0, Math.round(current + delta));
    ctrl.setValue(next);
    this.form.markAsDirty();
    this.facade.addSteps(delta); // actualizare imediata UI
  }

  public async onSaveData(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const patch = this.form.getRawValue() as Partial<DailyUserData>;
    await this.facade.saveDaily(patch);
    this.autoSaveStatus = 'saved';
    this.celebrateDailyCompletion();
    this.notifications.offerPushAfterDailyCheckIn();
  }

  public async onReset(): Promise<void> {
    const date = this.form.get('date')?.value;
    if (!date) return;

    const mealsDeleted = await this.facade.deleteMealsForDate(date);
    if (!mealsDeleted) {
      this.alerts.error('Reset failed. Your daily data was not changed.');
      return;
    }

    await this.facade.resetDailyForDate(date);
    await this.facade.loadTodaySummary();
    this.lastAppliedMeal = null;
    this.form.markAsPristine();
    this.autoSaveStatus = 'idle';
    this.alerts.success('Daily data and meals reset.');
  }

  private buildForm(): FormGroup {
    const v = this.facade.dailyDataValidation.getControlValidators();
    return this.fb.group({
      date: [this.facade.todayDate, v.date ?? []],
      activityType: ['Rest Day'],
      waterConsumedL: [0, v.waterConsumedL ?? []],
      steps: [0, v.steps ?? []],
      stepTarget: [3000, v.stepTarget ?? []],
      macrosPct: this.fb.group({
        protein: [0, v.macrosPct?.protein ?? []],
        carbs: [0, v.macrosPct?.carbs ?? []],
        fats: [0, v.macrosPct?.fats ?? []],
      }),
      caloriesBurned: [0, v.caloriesBurned ?? []],
      // caloriesIntake REMOVED — now server-computed from MealEntries (Fix 10)
      // caloriesTotal REMOVED — now server-computed from backend (Fix 10)
    });
  }


  public adjustCaloriesBurned(delta: number): void {
    const ctrl = this.form.get('caloriesBurned');
    if (!ctrl) return;
    const current = Number(ctrl.value ?? 0);
    const next = Math.max(0, current + delta);
    ctrl.setValue(next);
  }

  private setupCaloriesBurnedLiveSync(): void {
    this.form.get('caloriesBurned')?.valueChanges.pipe(
      takeUntilDestroyed(),
      filter(() => !this.isPatchingFromBackend),
      map(value => Math.max(0, Number(value) || 0)),
      distinctUntilChanged(),
    ).subscribe(value => this.facade.setCaloriesBurned(value));
  }

  private celebrateDailyCompletion(): void {
    if (this.dailyCompletionCelebrated) return;

    const water = Number(this.form.get('waterConsumedL')?.value ?? 0);
    const waterTarget = Number(this.facade.waterTargetFromMetrics() ?? 0);
    const steps = Number(this.form.get('steps')?.value ?? 0);
    const stepTarget = Number(this.form.get('stepTarget')?.value ?? 0);
    const activity = String(this.form.get('activityType')?.value ?? '').trim();

    if (!activity || waterTarget <= 0 || stepTarget <= 0 || water < waterTarget || steps < stepTarget) return;

    this.dailyCompletionCelebrated = true;
    const streak = this.facade.streak()?.current ?? 0;
    const message = streak > 0
      ? `Day logged — your ${streak}-day streak is safe 🔥`
      : 'Day logged — all daily goals complete!';
    this.alerts.success(message, 'Great work!');
  }

  private setupDailyEffect() {
    effect(() => {
      const d = this.facade.dailyData();
      if (!d) return;
      if (this.form.dirty) return;

      this.isPatchingFromBackend = true;
      const summary = this.facade.todaySummary();
      const macrosPct = summary
        ? {
            protein: this.oneDecimal(summary.proteinFromNutritionLog_g),
            carbs: this.oneDecimal(summary.carbsFromNutritionLog_g),
            fats: this.oneDecimal(summary.fatsFromNutritionLog_g),
          }
        : d.macrosPct;
      this.form.patchValue({ ...d, macrosPct }, { emitEvent: true });
      setTimeout(() => { this.isPatchingFromBackend = false; }, 0);
    });
  }

}
