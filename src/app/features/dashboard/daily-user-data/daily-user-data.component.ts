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

  private fb = inject(FormBuilder)

  public history = this.facade.history;

  public aiError: string | null = null;


  constructor() {
    this.form = this.buildForm();
    this.setupDailyEffect();
  }

  ngOnInit(): void {
    this.facade.loadDailyFromFireStore();
  }

   // ========== helpers numeric ==========
  private num(v: unknown): number { 
    const n = Number(v); return Number.isFinite(n) ? n : 0; 
  }

  private getNum(path: string): number { 
    return this.num(this.form.get(path)?.value ?? 0); 
  }

  private setNum(path: string, value: number): void {
    const c = this.form.get(path); if (c) c.setValue(Math.max(0, Math.round(value)));
  }

  private addNum(path: string, delta: number): void { 
    this.setNum(path, this.getNum(path) + this.num(delta)); 
  }

  private estimateCaloriesFromMacros(p?: number, c?: number, f?: number): number {
    return Math.max(0, Math.round(4 * this.num(p) + 4 * this.num(c) + 9 * this.num(f)));
  }


  // ========== handler from child component ==========
  onMealAdded(res: MealMacros) {
    const p = this.num(res.protein_g);
    const c = this.num(res.carbs_g);
    const f = this.num(res.fats_g);
    const kcal = res.calories_kcal != null ? this.num(res.calories_kcal) : this.estimateCaloriesFromMacros(p, c, f);

    if (p > 0) this.addNum('macrosPct.protein', p);
    if (c > 0) this.addNum('macrosPct.carbs', c);
    if (f > 0) this.addNum('macrosPct.fats', f);
    if (kcal > 0) this.addNum('caloriesIntake', kcal);

    this.form.markAsDirty();
    this.alerts.success('Macros added successfully.');

  }

  onMealAddedError(msg: string) {
  this.aiError = msg?.toString() || 'AI analysis failed.';
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
