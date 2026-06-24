// ── Dashboard Today ──────────────────────────────────────────────────
// Matches FitApp.Api/Models/DTOs/DashboardDtos.cs (BACKEND_READY)
// PRIVACY: calorieBalance.goal, macros[].target,
//          burned.goal, water.goal are owner-only — never social/public.

export interface DashboardTodayDto {
  calorieBalance: CalorieBalanceDto;
  macros: MacroProgressItemDto[];
  burned: RingMetricDto;
  water: RingMetricDto;
  steps: RingMetricDto;
  streak: DashboardStreakDto;
  meta: DashboardMetaDto;
  weeklyWorkouts: WeeklyWorkoutsDto;
}

export interface CalorieBalanceDto {
  eaten: number;
  burned: number;
  goal: number;       // BMR/TDEE — OWNER ONLY
  net: number;        // eaten − burned
  remaining: number;  // max(0, goal − net)
  onTrack: boolean;
}

export interface MacroProgressItemDto {
  name: string;    // "Protein" | "Carbs" | "Fat"
  consumed: number; // grams
  target: number;   // grams — OWNER ONLY
  unit: string;     // "g"
}

export interface RingMetricDto {
  value: number;
  goal: number;    // 0 for burned ring (counter mode)
  unit: string;    // "kcal" | "ml" | "steps"
}

export interface DashboardStreakDto {
  current: number;
  best: number;
}

export interface DashboardMetaDto {
  date: string;        // "2026-06-12" (ISO)
  statusBadge: string; // "MAINTENANCE" | "CUTTING" | "BULKING"
}

// ── Weekly Workouts (unchanged from WIP) ────────────────────────────

export interface WeeklyWorkoutsDto {
  days: DayWorkoutDto[];
  lastWorkoutAt: string | null;
  totalThisWeek: number;
}

export interface DayWorkoutDto {
  dayLabel: string;
  hasWorkout: boolean;
  durationMinutes: number;
  isToday: boolean;
}

// ── AI Insight (unchanged, separate endpoint) ────────────────────────

export interface AiInsightDto {
  insight: string;
  generatedAt: string;
}

// ── Activity Grid (unchanged) ────────────────────────────────────────

export interface PostGridPageDto {
  items: PostGridItemDto[];
  hasMore: boolean;
  page: number;
}

export interface PostGridItemDto {
  postId: number;
  workoutType: string | null;
  durationMin: number | null;
  createdAt: string;
  thumbnailUrl: string | null;
}

/** Profile post interface used by ActivityGridComponent */
export interface ProfilePost {
  postId: string;
  imageUrl?: string;
  workoutType?: string;
  durationMin?: number;
  timestamp: Date;
}

/** Activity item interface used by RecentActivityFeedComponent */
export interface ActivityItem {
  id: string;
  type: 'workout' | 'meal' | 'weight' | 'water';
  title: string;
  subtitle: string;
  timestamp: Date;
}

/** WeekDayEntry interface used by WeeklyWorkoutCardComponent */
export interface WeekDayEntry {
  dayLabel: string;
  durationMin: number;
  isToday: boolean;
}
