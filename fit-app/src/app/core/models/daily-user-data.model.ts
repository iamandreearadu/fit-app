export interface DailyUserData {
    date: string;
    activityType?: DayType;
    waterConsumedL?: number;
    steps?: number;
    stepTarget?: number;
    macrosPct?: { protein: number; carbs: number; fats: number };
    caloriesBurned?: number;
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
