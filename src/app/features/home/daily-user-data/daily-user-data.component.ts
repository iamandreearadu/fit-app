import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { DailyUserData } from '../../../core/models/daily-user-data.model';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserFacade } from '../../../core/facade/user.facade';

@Component({
  standalone: true,
  selector: 'app-daily-user-data',
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './daily-user-data.component.html',
  styleUrl: './daily-user-data.component.css'
})
export class DailyUserDataComponent implements OnInit {
  form: FormGroup;

  waterTargetL = 3;
  defaultStepTarget = 3000;

  facade = inject(UserFacade);
  fb = inject(FormBuilder)


  constructor() {
    const v = this.facade.getDailyValidators().getControlValidators();

    this.form = this.fb.group({
      date: [this.facade.todayDate, (v['date'] as any) || []],
      activityType: 'Rest Day',
      waterConsumedL: [0, (v['waterConsumedL'] as any) || []],
      steps: [0, (v['steps'] as any) || []],
      stepTarget: [0, (v['stepTarget'] as any) || []],
      macrosPct: this.fb.group({
        protein: [0, (v['macrosPct']?.protein as any) || []],
        carbs: [0, (v['macrosPct']?.carbs as any) || []],
        fats: [0, (v['macrosPct']?.fats as any) || []]
      }),
      caloriesBurned: [0, (v['caloriesBurned'] as any) || []],
      caloriesIntake: 0,
      caloriesTotal: 0,

    });

    // sync form from facade daily signal
    effect(() => {
      const d = this.facade.daily();
      if (d) {
        this.form.patchValue({
          date: d.date ?? this.facade.todayDate,
          activityType: d.activityType ?? 'Rest Day',
          waterConsumedL: d.waterConsumedL ?? 0,
          steps: d.steps ?? 0,
          stepTarget: d.stepTarget ?? this.defaultStepTarget,
          macrosPct: {
            protein: d.macrosPct?.protein ?? 0,
            carbs: d.macrosPct?.carbs ?? 0,
            fats: d.macrosPct?.fats ?? 0,
          },
          caloriesBurned: d.caloriesBurned ?? 0,
          caloriesIntake: d.caloriesIntake ?? 0,
          caloriesTotal: d.caloriesTotal ?? 0,
        }, { emitEvent: false });
      } else {
        this.form.patchValue(this.defaultValues(), { emitEvent: false });
      }
    });

    // disable form while daily load/save is in progress
    effect(() => {
      const isLoading = this.facade.dailyLoading();
      if (isLoading) this.form.disable({ emitEvent: false });
      else this.form.enable({ emitEvent: false });
    });

  }


  ngOnInit(): void {
    this.load();
  }

  private defaultValues(): Partial<DailyUserData> {
    return {
      date: this.facade.todayDate,
      activityType: 'Rest Day',
      waterConsumedL: 0,
      steps: 0,
      stepTarget: this.defaultStepTarget,
      macrosPct: { protein: 0, carbs: 0, fats: 0 },
      caloriesBurned: 0,
      caloriesIntake: 0,
      caloriesTotal: 0,
    };
  }

  async load(): Promise<void> {
    await this.facade.loadDaily();
  }

  async saveDailyData(): Promise<void> {
    if (this.form.invalid) return;
    const payload = this.form.value as Partial<DailyUserData>;
    await this.facade.saveDaily(payload);
  }

  reset(): void {
    const d = this.facade.daily();
    if (d) this.form.patchValue(d);
    else this.form.patchValue(this.defaultValues());
  }

  get waterTargetFromMetrics(){
  return this.facade.metrics()?.waterL;
}

  get todayLabel(): string {
    return this.facade.todayDate ?? 'Today';
  }

  // facade-backed computed getters and mutations
  // expose loading as a callable used by the template (was previously a local signal)
  loading() {
    return this.facade.dailyLoading();
  }

  // facade-backed computed callers (methods so template can call them)
  caloriesBurned() {
    return this.facade.caloriesBurned();
  }

  netCalories() {
    return this.facade.netCalories();
  }

  adjustCaloriesBurned(delta: number): void {
    void this.facade.adjustCaloriesBurned(delta);
  }

  totalCalories() {
    return this.facade.totalCalories();
  }

  waterConsumedL() {
    return this.facade.waterConsumed();
  }

  waterProgress() {
    return this.facade.waterProgress();
  }

  addWater(deltaL: number): void {
    void this.facade.addWater(deltaL);
  }

  steps() {
    return this.facade.steps();
  }

  stepTarget() {
    return this.facade.stepTarget();
  }

  stepsProgress() {
    return this.facade.stepsProgress();
  }

  addSteps(delta: number): void {
    void this.facade.addSteps(delta);
  }



}
