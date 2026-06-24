import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { toSignal } from '@angular/core/rxjs-interop';
import { OnboardingFacade } from '../../../core/facade/onboarding.facade';
import { UserStore } from '../../../core/store/user.store';
import { BiometricsRequest, LiveTdeeEstimate } from '../../../core/models/onboarding.model';

type Gender     = 'male' | 'female' | 'other';
type Activity   = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
type DietPref   = 'no-restriction' | 'vegetarian' | 'vegan' | 'high-protein';

interface ActivityOption {
  value: Activity;
  label: string;
  description: string;
}

interface DietOption {
  value: DietPref;
  label: string;
}

@Component({
  selector: 'app-onboarding-biometrics',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './onboarding-biometrics.component.html',
  styleUrl: './onboarding-biometrics.component.css',
})
export class OnboardingBiometricsComponent implements OnInit {
  private readonly router   = inject(Router);
  private readonly fb       = inject(FormBuilder);
  protected readonly facade = inject(OnboardingFacade);
  private readonly userStore = inject(UserStore);

  // ── Reactive form ─────────────────────────────────────────────────────────
  form = this.fb.group({
    heightCm: [null as number | null, [Validators.required, Validators.min(100), Validators.max(250)]],
    weightKg: [null as number | null, [Validators.required, Validators.min(30), Validators.max(300)]],
    age:      [null as number | null, [Validators.required, Validators.min(13), Validators.max(120)]],
  });

  // ── Pill / card selection state ───────────────────────────────────────────
  readonly selectedGender   = signal<Gender | null>(null);
  readonly selectedActivity = signal<Activity>('moderate');  // pre-selected
  readonly selectedDiet     = signal<DietPref>('no-restriction');  // pre-selected

  // ── Live TDEE estimate (client-side Mifflin-St Jeor, approximate) ─────────
  private readonly formValues = toSignal(this.form.valueChanges, {
    initialValue: this.form.value,
  });

  readonly liveEstimate = computed((): LiveTdeeEstimate | null => {
    const v = this.formValues();
    const h = v.heightCm ?? null;
    const w = v.weightKg ?? null;
    const a = v.age      ?? null;
    const g = this.selectedGender();
    const activity = this.selectedActivity();

    if (!h || !w || !a || !g) return null;
    if (h < 100 || w < 30 || a < 13) return null;

    const bmrMale   = 10 * w + 6.25 * h - 5 * a + 5;
    const bmrFemale = 10 * w + 6.25 * h - 5 * a - 161;
    const bmr = g === 'male'
      ? bmrMale
      : g === 'female'
        ? bmrFemale
        : (bmrMale + bmrFemale) / 2;

    const multipliers: Record<Activity, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9,
    };
    const tdee = Math.round(bmr * multipliers[activity]);

    const goal = this.userStore.user()?.goal ?? 'maintain';
    const goalCalories = goal === 'lose' ? tdee - 500
                       : goal === 'gain' ? tdee + 500
                       : tdee;

    return { tdee, goalCalories };
  });

  // ── Gender option list (typed objects, avoids 'as' casts in templates) ────
  readonly genderOptions: { value: Gender; label: string }[] = [
    { value: 'male',   label: 'Male'   },
    { value: 'female', label: 'Female' },
    { value: 'other',  label: 'Other'  },
  ];

  // ── Static option lists ───────────────────────────────────────────────────
  readonly activityOptions: ActivityOption[] = [
    { value: 'sedentary', label: 'Sedentary',  description: 'Desk job, little exercise' },
    { value: 'light',     label: 'Light',      description: '1–3 days/week' },
    { value: 'moderate',  label: 'Moderate',   description: '3–5 days/week' },
    { value: 'active',    label: 'Active',     description: '6–7 days/week' },
    { value: 'athlete',   label: 'Athlete',    description: 'Twice daily' },
  ];

  readonly dietOptions: DietOption[] = [
    { value: 'no-restriction', label: 'No restriction' },
    { value: 'vegetarian',     label: 'Vegetarian' },
    { value: 'vegan',          label: 'Vegan' },
    { value: 'high-protein',   label: 'High-protein' },
  ];

  ngOnInit(): void {}

  // ── Pill selection helpers ────────────────────────────────────────────────
  selectGender(g: Gender): void   { this.selectedGender.set(g); }
  selectActivity(a: Activity): void { this.selectedActivity.set(a); }
  selectDiet(d: DietPref): void   { this.selectedDiet.set(d); }

  // ── Form submission ───────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.selectedGender()) return;

    const v = this.form.getRawValue();

    const req: BiometricsRequest = {
      heightCm:          v.heightCm!,
      weightKg:          v.weightKg!,
      age:               v.age!,
      gender:            this.selectedGender()!,
      activityLevel:     this.selectedActivity(),
      dietaryPreference: this.selectedDiet(),
    };

    const result = await this.facade.submitBiometrics(req);
    if (result) {
      await this.router.navigate(['/onboarding/your-numbers']);
    }
  }

  goBack(): void {
    this.router.navigate(['/onboarding/carousel']);
  }
}
