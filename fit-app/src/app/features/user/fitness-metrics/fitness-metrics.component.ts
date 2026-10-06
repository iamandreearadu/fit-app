import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../../../core/material/material.module';
import { UserFacade } from '../../../core/facade/user.facade';

@Component({
  standalone: true,
  selector: 'app-fitness-metrics',
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
  templateUrl: './fitness-metrics.component.html',
  styleUrl: './fitness-metrics.component.css'
})
export class FitnessMetricsComponent {
  public facade = inject(UserFacade);
  public metrics = this.facade.metrics;
  private readonly fb = inject(FormBuilder);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly targetsForm = this.fb.group({
    calories: this.fb.control<number | null>(null, [Validators.min(800), Validators.max(8000)]),
    waterL: this.fb.control<number | null>(null, [Validators.min(0.5), Validators.max(10)]),
    steps: this.fb.control<number | null>(null, [Validators.min(500), Validators.max(100000)]),
  });

  startEditing(): void {
    const targets = this.facade.user()?.targets;
    if (!targets) return;
    this.targetsForm.reset({
      calories: targets.customCalories,
      waterL: targets.customWaterL,
      steps: targets.customSteps,
    });
    this.saveError.set('');
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.saveError.set('');
  }

  async saveTargets(): Promise<void> {
    if (this.targetsForm.invalid || this.saving()) {
      this.targetsForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.saveError.set('');
    const raw = this.targetsForm.getRawValue();
    const saved = await this.facade.saveDailyTargets(raw);
    this.saving.set(false);
    if (saved) this.editing.set(false);
    else this.saveError.set('Could not save your targets. Please try again.');
  }

  async useRecommended(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.saveError.set('');
    const saved = await this.facade.resetDailyTargets();
    this.saving.set(false);
    if (saved) this.editing.set(false);
    else this.saveError.set('Could not restore recommendations. Please try again.');
  }
}
