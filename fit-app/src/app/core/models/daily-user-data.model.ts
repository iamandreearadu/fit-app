export interface DailyUserData {
    date: string;
    activityType?: DayType;
    waterConsumedL?: number;
    steps?: number;
    stepTarget?: number;
    macrosPct?: { protein: number; carbs: number; fats: number };
    caloriesBurned?: number;
    /**
     * @deprecated NOT sent to the backend since Fix 10.
     * Calorie intake is server-computed from MealEntries via
     * GET /api/daily/today/summary.
     * Kept for backward compat with GET /api/daily?date= responses
     * and history views only.
     */
    caloriesIntake?: number;
    caloriesTotal?: number;
}

export type DayType = 'Strength Training' | 'Cardio' | 'HIIT Training' | 'Active Rest Day' | 'Rest Day'

export interface DailyUserDataStats {
  totalCalories: number;
  caloriesBurned: number;
  netCalories: number;
  caloriesIntake: number;
  waterConsumedL: number;
  steps: number;
  stepTarget: number;
  stepsProgress: number;
}

// Fix 10 — response from GET /api/daily/today/summary
export interface DailyEntrySummary {
  date: string;

  // Computed from MealEntries — read-only, server-computed
  caloriesFromNutritionLog: number;
  proteinFromNutritionLog_g: number;
  carbsFromNutritionLog_g: number;
  fatsFromNutritionLog_g: number;
  mealCount: number;

  // From DailyEntry (existing)
  activityType?: DayType;
  waterConsumedL: number;
  steps: number;
  stepTarget: number;
  caloriesBurned: number;
  caloriesTotal: number;

  // Existing manual macro percentages
  macrosPct: { protein: number; carbs: number; fats: number };

  updatedAt: string;
}
