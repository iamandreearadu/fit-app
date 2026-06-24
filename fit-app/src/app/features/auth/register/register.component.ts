import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AccountFacade } from '../../../core/facade/account.facade';
import { FormErrorService } from '../../../shared/services/form-error.service';
import { MaterialModule } from '../../../core/material/material.module';

interface GoalOption {
  value: string;
  label: string;
  emoji: string;
  /** "improve_fitness" is a display-only label; maps to "maintain" until the API
   *  extends beyond lose|gain|maintain (see Fix 4 design spec note). */
  apiValue: 'lose' | 'gain' | 'maintain';
}

const GOAL_OPTIONS: GoalOption[] = [
  { value: 'lose',             label: 'Lose weight',    emoji: '🔥', apiValue: 'lose'     },
  { value: 'gain',             label: 'Build muscle',   emoji: '💪', apiValue: 'gain'     },
  { value: 'maintain',         label: 'Stay steady',    emoji: '⚖️', apiValue: 'maintain' },
  { value: 'improve_fitness',  label: 'Improve fitness', emoji: '🏃', apiValue: 'maintain' },
];

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MaterialModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly router = inject(Router);
  public  readonly facade = inject(AccountFacade);
  public  readonly formErrors = inject(FormErrorService);

  private readonly validators = this.facade.authValidation.getRegisterValidators();

  form = this.fb.group({
    fullName: ['', this.validators.fullName],
    email:    ['', this.validators.email],
    password: ['', this.validators.password],
  });

  // ── Goal selector state ───────────────────────────────────────────────────
  readonly showPassword = signal(false);

  readonly goalOptions = GOAL_OPTIONS;
  readonly selectedGoal = signal<GoalOption>(GOAL_OPTIONS[0]); // pre-select "Lose weight"
  readonly goalError = signal(false);

  selectGoal(opt: GoalOption): void {
    this.selectedGoal.set(opt);
    this.goalError.set(false);
  }

  // ── Form submission ───────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue() as { fullName: string; email: string; password: string };

    const ok = await this.facade.register({
      fullName: raw.fullName,
      email:    raw.email,
      password: raw.password,
      goal:     this.selectedGoal().apiValue,
    });

    if (ok) {
      // Fix 4: redirect to onboarding carousel (not user-dashboard)
      await this.router.navigate(['/onboarding/carousel']);
    } else {
      this.form.get('password')?.reset();
    }
  }
}
