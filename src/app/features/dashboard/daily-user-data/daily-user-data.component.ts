import { Component, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { UserFacade } from '../../../core/facade/user.facade';
import { DailyUserData } from '../../../core/models/daily-user-data.model';
import { MaterialModule } from '../../../core/material/material.module';

@Component({
  standalone: true,
  selector: 'app-daily-user-data',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  host: { class: 'd-block' },
  templateUrl: './daily-user-data.component.html',
  styleUrls: ['./daily-user-data.component.css']
})
export class DailyUserDataComponent implements OnInit {

  public form: FormGroup;

  public facade = inject(UserFacade);
  private fb = inject(FormBuilder)

  public history = this.facade.history;

  constructor() {
    this.form = this.buildForm();
    this.setupDailyEffect();
  }

  ngOnInit(): void {
    this.facade.loadDailyFromFireStore();
  }

  // ========== Event handlers ==========

  public onDateChange(date: string) {
    this.facade.loadDailyFromFireStore(date);
  }


  public async onSaveData(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const patch = this.form.getRawValue() as Partial<DailyUserData>;
    await this.facade.saveDailyToFireStore(patch);
  }


  public async onReset(): Promise<void> {
    const date = this.form.get('date')?.value;
    if (!date) return;

    await this.facade.resetDailyForDate(date);
    this.form.markAsPristine();
  }

  // ========== helpers ==========


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
      this.form.patchValue(d, { emitEvent: false });
    });
  }

  public get isTodaySelected(): boolean {
    return this.form.get('date')?.value === this.facade.todayDate;
  }

}
