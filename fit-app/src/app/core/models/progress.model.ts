export type ProgressWindow = 7 | 30;
export type ProgressTrendKind = 'calories' | 'macros' | 'hydration' | 'steps';
export type CompleteDayItem = 'meals' | 'activity' | 'steps' | 'water';

export interface ProgressTrendsDto {
  window: number;
  dates: string[];
  weightKg: Array<number | null>;
  energyLevel: Array<number | null>;
  caloriesIn: number[];
  caloriesBurned: number[];
  tdee: number;
  proteinG: number[];
  carbsG: number[];
  fatG: number[];
  waterL: number[];
  waterTargetL: number;
  steps: number[];
  stepTarget: number[];
}

export interface CompleteStreakStatusDto {
  completeDayStreak: number;
  loggedTodayComplete: boolean;
  missingToday: CompleteDayItem[];
  daysUntilUnlock: number;
}

export interface NutritionistWeeklyReportDto {
  windowStart: string;
  windowEnd: string;
  userGoal: 'lose' | 'gain' | 'maintain';
  goalCalories: number;
  avgCaloriesIn: number;
  tdee: number;
  netCaloriesTotal: number;
  estimatedWeightChangeKg: number;
  actualWeightChangeKg: number | null;
  avgWaterL: number;
  waterTargetL: number;
  waterAdherencePct: number;
  avgSteps: number;
  stepTarget: number;
  mealsLogged: number;
  avgProteinPct: number;
  avgCarbsPct: number;
  avgFatPct: number;
  targetProteinPct: number;
  targetCarbsPct: number;
  targetFatPct: number;
  aiNarrative: string;
  generatedAt: string;
}

export interface ProgressSummaryDto {
  trends: ProgressTrendsDto;
  streak: CompleteStreakStatusDto;
  weeklyReport: NutritionistWeeklyReportDto | null;
}
