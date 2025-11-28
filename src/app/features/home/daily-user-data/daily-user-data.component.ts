import { Component, inject, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { DailyUserData } from '../../../core/models/daily-user-data.model';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UserFacade } from '../../../core/facade/user.facade';

@Component({
  standalone: true,
  selector: 'app-daily-user-data',
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './daily-user-data.component.html',
  styleUrl: './daily-user-data.component.css'
})
export class DailyUserDataComponent implements OnInit, OnDestroy {
  form: FormGroup;

  waterTargetL = 3;
  defaultStepTarget = 3000;

  facade = inject(UserFacade);
  fb = inject(FormBuilder)
  private dateSub?: Subscription;


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
      caloriesIntake:  [0, (v['caloriesIntake'] as any) || []],
      caloriesTotal:  [0, (v['caloriesTotal'] as any) || []],

    });

    // sync form from facade daily signal
    effect(() => {
      const d = this.facade.daily();
      if (d) {
        // don't overwrite user's in-progress edits — only patch when the form is not dirty
        if (this.form.dirty) return;

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
    this.getDataFromDate();
  }

  ngOnDestroy(): void {
   this.dateSub?.unsubscribe();
  }

  getDataFromDate(){
 // when the user changes the date control, load that day's data
    const dateControl = this.form.get('date');
    if (dateControl) {
      this.dateSub = dateControl.valueChanges.subscribe(async (val) => {
        if (!val) return;
        try {
          console.log(val);
          // if user has unsaved valid edits, save them first
          // if (this.form.dirty && this.form.valid) {
          //  await this.saveDailyData();
          // }

          const d = await this.facade.getDailyData(val);
          console.log(d)
           if (d) this.form.patchValue(d, { emitEvent: false });
           else this.form.patchValue(this.defaultValues(), { emitEvent: false });
      
          this.form.markAsPristine();
        } catch (err) {
          console.error('Failed to load daily data for date', val, err);
        }
      });
    }
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
    // mark as clean so the sync effect may re-apply values from facade.daily
    this.form.markAsPristine();
  }

  reset(): void {
    const d = this.facade.daily();
    if (d) this.form.patchValue(d);
    else this.form.patchValue(this.defaultValues());
    // reset considered a saved/clean state
    this.form.markAsPristine();
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
    // prefer the form value when the user is editing so UI updates immediately
    if (this.form?.dirty) {
      return Number(this.form.get('caloriesBurned')?.value ?? this.facade.caloriesBurned());
    }
    return this.facade.caloriesBurned();
  }

  netCalories() {
    // compute net calories based on current visible totalCalories and burned kcal
    const total = this.totalCalories();
    const burned = this.caloriesBurned();
    return Math.max(0, total - burned);
  }

  adjustCaloriesBurned(delta: number): void {
    // update form control and persist whole form so we don't overwrite other unsaved inputs
    const cur = Number(this.form.get('caloriesBurned')?.value ?? 0);
    const next = Math.max(0, cur + delta);
    this.form.patchValue({ caloriesBurned: next });
    void this.saveDailyData();
  }

  totalCalories() {
    // if the form is being edited prefer computing from form macros so changes appear live
    if (this.form?.dirty) {
      const macros = this.form.get('macrosPct')?.value ?? { protein: 0, carbs: 0, fats: 0 };
      const p = Number(macros?.protein ?? 0);
      const c = Number(macros?.carbs ?? 0);
      const f = Number(macros?.fats ?? 0);
      return Math.round(p * 4 + c * 4 + f * 9);
    }
    return this.facade.totalCalories();
  }

  waterConsumedL() {
    return this.facade.waterConsumed();
  }

  waterProgress() {
    return this.facade.waterProgress();
  }

  addWater(deltaL: number): void {
    // update form control and persist whole form so we don't overwrite other unsaved inputs
    const cur = Number(this.form.get('waterConsumedL')?.value ?? 0);
    const next = Math.max(0, +(cur + deltaL).toFixed(2));
    this.form.patchValue({ waterConsumedL: next });
    void this.saveDailyData();
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
    // update form control and persist whole form so we don't overwrite other unsaved inputs
    const cur = Number(this.form.get('steps')?.value ?? 0);
    const next = Math.max(0, cur + delta);
    this.form.patchValue({ steps: next });
    void this.saveDailyData();
  }

}
