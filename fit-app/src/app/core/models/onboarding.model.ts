// PRIVACY: All interfaces in this file contain private health data.
// Responses MUST NOT be exposed in social endpoints, feed cards, or public-facing APIs.

export interface BiometricsRequest {
  heightCm: number;
  weightKg: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
  dietaryPreference?: 'no-restriction' | 'vegetarian' | 'vegan' | 'high-protein';
}

export interface YourNumbersResponse {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  goalCalories: number;
  dailyCalorieTarget: number;
  waterLiters: number;
  goal: string;
}

export interface RecordStepRequest {
  stepName: 'carousel_seen' | 'biometrics_complete' | 'first_action_taken';
}

export interface OnboardingStatusResponse {
  isComplete: boolean;
  lastCompletedStep: string | null;
  nextStep: string | null;
}

/** Client-side only — not sent to any API. Used for live TDEE preview in biometrics form. */
export interface LiveTdeeEstimate {
  tdee: number;
  goalCalories: number;
}
