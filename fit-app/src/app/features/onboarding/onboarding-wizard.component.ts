import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { UserFacade } from '../../core/facade/user.facade';
import { UserStore } from '../../core/store/user.store';
import { Activity, DietaryPreference, Goal, Sex } from '../../core/models/user.model';

interface OnboardingData {
  goal: Goal;
  gender: Sex;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  activity: Activity;
  dietaryPreference: DietaryPreference;
}

@Component({
  selector: 'app-onboarding-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule],
  templateUrl: './onboarding-wizard.component.html',
  styleUrl: './onboarding-wizard.component.css',
})
export class OnboardingWizardComponent {
  private readonly userFacade = inject(UserFacade);
  private readonly userStore = inject(UserStore);
  private readonly router = inject(Router);
  private readonly dialogRef = inject(MatDialogRef<OnboardingWizardComponent>);

  readonly step = signal(0);
  readonly isSaving = signal(false);

  readonly data: OnboardingData = {
    goal: 'maintain',
    gender: 'other',
    age: null,
    heightCm: null,
    weightKg: null,
    activity: 'moderate',
    dietaryPreference: 'no-restriction',
  };

  readonly goals: { value: Goal; label: string; icon: string; desc: string }[] = [
    { value: 'lose',     label: 'Lose Weight',       icon: 'trending_down',  desc: 'Burn fat, get leaner' },
    { value: 'gain',     label: 'Build Muscle',      icon: 'fitness_center', desc: 'Gain strength & size' },
    { value: 'maintain', label: 'Stay Healthy',      icon: 'favorite',       desc: 'Maintain current shape' },
  ];

  readonly activityLevels: { value: Activity; label: string; desc: string }[] = [
    { value: 'sedentary', label: 'Sedentary',     desc: 'Little or no exercise' },
    { value: 'light',     label: 'Light',         desc: '1–3 days/week' },
    { value: 'moderate',  label: 'Moderate',      desc: '3–5 days/week' },
    { value: 'active',    label: 'Active',         desc: '6–7 days/week' },
    { value: 'athlete',   label: 'Athlete',        desc: 'Twice a day / intense' },
  ];

  readonly genderOptions: [Sex, string][] = [
    ['female', 'Female'],
    ['male', 'Male'],
    ['other', 'Other'],
  ];

  readonly diets: { value: DietaryPreference; label: string; icon: string }[] = [
    { value: 'no-restriction', label: 'No Restriction', icon: 'restaurant' },
    { value: 'vegetarian',     label: 'Vegetarian',     icon: 'eco' },
    { value: 'vegan',          label: 'Vegan',           icon: 'grass' },
    { value: 'high-protein',   label: 'High Protein',   icon: 'sports_gymnastics' },
  ];

  readonly stepLabels = ['Goal', 'Profile', 'Diet', 'Start'];
  readonly totalSteps = 4;

  next(): void {
    if (this.step() < this.totalSteps - 1) this.step.update(s => s + 1);
  }

  back(): void {
    if (this.step() > 0) this.step.update(s => s - 1);
  }

  isStep1Valid(): boolean {
    return !!this.data.goal;
  }

  isStep2Valid(): boolean {
    return !!(this.data.age && this.data.heightCm && this.data.weightKg && this.data.gender);
  }

  async finish(action: 'workout' | 'meal' | 'skip'): Promise<void> {
    if (this.isSaving()) return;
    this.isSaving.set(true);

    const current = this.userStore.user();
    try {
      await this.userFacade.saveUserProfile({
        ...(current as any),
        goal: this.data.goal,
        gender: this.data.gender,
        age: this.data.age ?? current?.age ?? 0,
        heightCm: this.data.heightCm ?? current?.heightCm ?? 0,
        weightKg: this.data.weightKg ?? current?.weightKg ?? 0,
        activity: this.data.activity,
        dietaryPreference: this.data.dietaryPreference,
        onboardingCompleted: true,
      });
    } finally {
      this.isSaving.set(false);
    }

    this.dialogRef.close();

    if (action === 'workout') {
      await this.router.navigate(['/workouts']);
    } else if (action === 'meal') {
      await this.router.navigate(['/nutrition']);
    }
  }
}
