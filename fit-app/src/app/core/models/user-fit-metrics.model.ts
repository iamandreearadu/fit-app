export interface UserFitMetrics {
  bmi: number | null;
  bmr: number | null;
  bmiCat: string | null;
  tdee: number | null;
  waterL: number | null;
  goalCalories: number | null;
  idealWeightKgRange: { min: number; max: number } | null;
  lastCalculatedAt: string | null;
}
