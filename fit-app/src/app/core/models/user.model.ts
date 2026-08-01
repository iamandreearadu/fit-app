export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  heightCm: number;
  imageUrl?: string;
  weightKg: number;
  age: number;
  gender: Sex;
  activity: Activity;
  goal: Goal;
  onboardingCompleted: boolean;
  dietaryPreference?: DietaryPreference;
  metrics?: ServerFitnessMetrics;
  targets?: DailyTargets;
}

export interface ServerFitnessMetrics {
  bmi: number | null;
  bmr: number | null;
  tdee: number | null;
  goalCalories: number | null;
  waterL: number | null;
  bmiCat: string | null;
}

export interface DailyTargets {
  recommendedCalories: number;
  recommendedWaterL: number;
  recommendedSteps: number;
  customCalories: number | null;
  customWaterL: number | null;
  customSteps: number | null;
  effectiveCalories: number;
  effectiveWaterL: number;
  effectiveSteps: number;
}

export interface StreakData {
  current: number;
  longest: number;
  loggedToday: boolean;
  atRisk: boolean;
  // Added for Fix 5 — navigation badge (optional, additive — Dashboard unaffected):
  lastLogDate?: string;    // ISO date "yyyy-MM-dd", populated via SignalR only
  isNewRecord?: boolean;   // true when current streak == all-time longest, from SignalR push
}

export type Sex = 'female' | 'male' | 'other';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
export type Goal = 'maintain' | 'lose' | 'gain';
export type DietaryPreference = 'no-restriction' | 'vegetarian' | 'vegan' | 'high-protein';
