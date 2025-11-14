import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DailyUserData } from '../../../core/models/daily-user-data.model';
import { DailyUserDataService } from '../../../core/services/daily-user-data.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserFacade } from '../../../core/facade/user.facade';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  standalone: true,
  selector: 'app-daily-user-data',
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './daily-user-data.component.html',
  styleUrl: './daily-user-data.component.css'
})
export class DailyUserDataComponent implements OnInit {
  data = signal<DailyUserData | null>(null);
  form: FormGroup;
  loading = signal(false);
  formValue: ReturnType<typeof toSignal>;

  waterTargetL = 3;     
  defaultStepTarget = 3000;


  dailyService = inject(DailyUserDataService);
  facade = inject(UserFacade);
  fb = inject(FormBuilder)


  constructor() {
    this.form = this.fb.group({
      date: [this.dailyService.todayDate, Validators.required],
      activityType: 'Rest Day',
      waterConsumedL: 0,
      steps:0,
      stepTarget:0,
      macrosPct: this.fb.group({
        protein: 0,
        carbs: 0,
        fats: 0
      }),
      caloriesBurned: 0,
      caloriesIntake: 0,
      caloriesTotal: 0,

    });

     this.formValue = toSignal(this.form.valueChanges, {
      initialValue: this.form.value
    });

  }


  ngOnInit(): void {
    this.load();
  }

  private defaultValues(): Partial<DailyUserData> {
    return {
      date: this.dailyService.todayDate,
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
    this.loading.set(true);
    try {
      this.data.set(await this.dailyService.getDailyUserData());
      const vals = this.data ?? this.defaultValues();
      this.form.patchValue(vals);
    } finally {
    this.loading.set(false);
    }
  }

  async saveDailyData(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    try {
      const payload = this.form.value as Partial<DailyUserData>;
      const updated = await this.dailyService.setDailyUserData(payload);
      this.data.set(updated);
      this.form.patchValue(updated);
    
    } finally {
      this.loading.set(false);
    }
  }

  reset(): void {
    if (this.data) this.form.patchValue(this.data);
    else this.form.patchValue(this.defaultValues());
  }

  get waterTargetFromMetrics(){
  return this.facade.metrics()?.waterL;
}

  get todayLabel(): string {
    return this.dailyService.todayDate ?? 'Today';
  }


  // calories burned
   caloriesBurned = computed(() => {
    const val = this.formValue() as Partial<DailyUserData>;
    return Number(val.caloriesBurned ?? 0);
  });

  netCalories = computed(() => {
    const net = this.totalCalories() - this.caloriesBurned();
    return Math.max(0, Math.round(net));
  });

  adjustCaloriesBurned(delta: number): void {
    const current = this.caloriesBurned();
    const next = Math.max(0, current + delta);
    this.form.get('caloriesBurned')?.setValue(next);
  }



  //total calories
  totalCalories = computed(() => {
    const val = this.formValue() as Partial<DailyUserData>; 
    const macros = val.macrosPct ?? { protein: 0, carbs: 0, fats: 0 };
    const p = Number(macros.protein ?? 0);
    const c = Number(macros.carbs ?? 0);
    const f = Number(macros.fats ?? 0);
  
    const totalCal = p*4 + c*4 + f*9;
    return Math.round(totalCal);
  })



  // water
  waterConsumedL = computed(() => {
    const val = this.formValue() as Partial<DailyUserData>;
    return Number(val.waterConsumedL ?? 0);
  })

   waterProgress = computed(() => {
    if(!this.waterTargetFromMetrics) return 0;
    const pct = (this.waterConsumedL() / this.waterTargetFromMetrics) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
   })

  addWater(deltaL: number): void {
    const current = this.waterConsumedL();
    const next = Math.max(0, current + deltaL);
    this.form.get('waterConsumedL')?.setValue(+next.toFixed(2));
  }

  // steps
   steps = computed(() => {
    const val = this.formValue() as Partial<DailyUserData>;
    return Number(val.steps ?? 0);
   })

   stepTarget = computed(() => {
    const val = this.formValue() as Partial<DailyUserData>;
    return Number(val.stepTarget ?? this.defaultStepTarget);
   })

  
   stepsProgress =computed(() => {
    const target = this.stepTarget();
    const pct = (this.steps() / target) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
   })

  addSteps(delta: number): void {
    const current = this.steps();
    const next = Math.max(0, current + delta);
    this.form.get('steps')?.setValue(next);
  }



}