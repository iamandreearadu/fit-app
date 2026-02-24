import { Component, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { UserFacade } from '../../../core/facade/user.facade';
import { DailyUserData } from '../../../core/models/daily-user-data.model';
import { MaterialModule } from '../../../core/material/material.module';
import { GroqAiFacade } from '../../../core/facade/groq-ai.facade';
import { MealMacros } from '../../../core/models/meal-macros';
import { AiMealAnalyzerComponent } from './ai-meal-analyzer/ai-meal-analyzer.component';
import { AlertService } from '../../../shared/services/alert.service';
import { WorkoutsTabFacade } from '../../../core/facade/workouts-tab.facade';

import { from, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  standalone: true,
  selector: 'app-daily-user-data',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, AiMealAnalyzerComponent],
  host: { class: 'd-block' },
  templateUrl: './daily-user-data.component.html',
  styleUrls: ['./daily-user-data.component.css']
})
export class DailyUserDataComponent implements OnInit {

  public form: FormGroup;

  public facade = inject(UserFacade);
  public groqFacade = inject(GroqAiFacade);
  public alerts = inject(AlertService);
  public workoutsFacade = inject(WorkoutsTabFacade);
  private fb = inject(FormBuilder);

  public history = this.facade.history;

  public showAnalyzeOverlay = false;
  public analyzeError: string | null = null;

  public autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  private isPatchingFromBackend = false;
  private lastSavedSerialized: string | null = null;

  constructor() {
    this.form = this.buildForm();
    this.setupDailyEffect();
    this.setupAutoSave();
    this.setupWorkoutAutoFill();
  }

  ngOnInit(): void {
    this.facade.loadDailyFromFireStore();
    this.workoutsFacade.loadTemplates();
  }

  openMealAnalyze(): void {
    this.analyzeError = null;
    this.showAnalyzeOverlay = true;
  }

  closeMealAnalyze(): void {
    this.showAnalyzeOverlay = false;
  }

  onAnalyzerAdded(res: MealMacros): void {
    this.applyMealToForm(res);
    this.closeMealAnalyze();
  }

  onAnalyzerError(msg: string): void {
    this.analyzeError = msg || 'Analysis failed.';
    this.alerts.error('Macros analysis failed.');
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
        from(this.facade.saveDailyToFireStore(patch)).pipe(
          tap(() => {
            this.autoSaveStatus = 'saved';
            this.form.markAsPristine();
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
      const template = this.workoutsFacade.templates.find(t => t.uid === uid);
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

    const intakeCtrl = this.form.get('caloriesIntake');
    const currIntake = Number(intakeCtrl?.value ?? 0);
    const kcal = (meal.calories_kcal != null)
      ? Number(meal.calories_kcal)
      : Math.round((meal.protein_g || 0) * 4 + (meal.carbs_g || 0) * 4 + (meal.fats_g || 0) * 9);

    intakeCtrl?.setValue(Math.max(0, Math.round(currIntake + kcal)));
    this.form.markAsDirty();
  }

  public adjustWaterMl(deltaMl: number): void {
    const ctrl = this.form.get('waterConsumedL');
    if (!ctrl) return;
    const current = Number(ctrl.value ?? 0);
    const next = Math.max(0, +(current + deltaMl / 1000).toFixed(3));
    ctrl.setValue(next);
    this.form.markAsDirty();
  }

  public adjustSteps(delta: number): void {
    const ctrl = this.form.get('steps');
    if (!ctrl) return;
    const current = Number(ctrl.value ?? 0);
    const next = Math.max(0, Math.round(current + delta));
    ctrl.setValue(next);
    this.form.markAsDirty();
  }

  public onDateChange(date: string) {
    this.autoSaveStatus = 'idle';
    this.facade.loadDailyFromFireStore(date);
  }

  public async onSaveData(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const patch = this.form.getRawValue() as Partial<DailyUserData>;
    await this.facade.saveDailyToFireStore(patch);
    this.autoSaveStatus = 'saved';
  }

  public async onReset(): Promise<void> {
    const date = this.form.get('date')?.value;
    if (!date) return;
    await this.facade.resetDailyForDate(date);
    this.form.markAsPristine();
    this.autoSaveStatus = 'idle';
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
      caloriesIntake: [0, v.caloriesIntake ?? []],
      caloriesTotal: [0, v.caloriesTotal ?? []],
    });
  }

  public adjustCaloriesBurned(delta: number): void {
    const ctrl = this.form.get('caloriesBurned');
    if (!ctrl) return;
    const current = Number(ctrl.value ?? 0);
    const next = Math.max(0, current + delta);
    ctrl.setValue(next);
  }

  private setupDailyEffect() {
    effect(() => {
      const d = this.facade.dailyData();
      if (!d) return;
      if (this.form.dirty) return;

      this.isPatchingFromBackend = true;
      this.form.patchValue(d, { emitEvent: true });
      setTimeout(() => { this.isPatchingFromBackend = false; }, 0);
    });
  }

  public get isTodaySelected(): boolean {
    return this.form.get('date')?.value === this.facade.todayDate;
  }
}
