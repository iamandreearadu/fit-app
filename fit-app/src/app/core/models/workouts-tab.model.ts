export type WorkoutType =
  | 'Strength'
  | 'Circuit'
  | 'HIIT'
  | 'Crossfit'
  | 'Cardio'
  | 'Other';

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  notes?: string;
}

export interface CardioDetails {
  km: number;
  incline: number;
  notes?: string;
}

export interface WorkoutTemplate {
  uid?: string;
  id: number;

  title: string;
  type: WorkoutType;

  durationMin: number;
  caloriesEstimateKcal: number;

  exercises?: WorkoutExercise[];
  cardio?: CardioDetails;
  notes?: string;

  createdAt?: string;
  updatedAt?: string;

  /** true when this row is a seeded system template (userId = null server-side).
   *  Frontend shows WorkoutsGuidedEmptyComponent when every() template has this flag.
   *  Default false for all user-owned templates. */
  isSystemTemplate: boolean;
}

// ── Fix 6: Active Workout Session ─────────────────────────────────────────────

/** Previous session data for one exercise — used as ghost placeholder text in set rows */
export interface LastExerciseSession {
  exerciseName: string;
  lastWeightKg: number;
  lastReps: number;
  lastDate: string; // "yyyy-MM-dd"
}

/** One completed set submitted when finishing a session */
export interface CompletedSet {
  exerciseName: string;
  setNumber: number;
  actualWeightKg: number;
  actualReps: number;
}

/** Request body for POST /api/workouts/sessions */
export interface CompleteSessionRequest {
  workoutTemplateId: number;
  startedAt: string; // ISO 8601
  finishedAt: string; // ISO 8601
  sets: CompletedSet[];
}

/** Response from POST /api/workouts/sessions — consumed by Fix 8 summary card + Fix 7 share */
export interface WorkoutCompletionSummary {
  sessionId: number;
  templateTitle: string;
  durationMin: number;
  exerciseCount: number;
  setsCompleted: number;
  estimatedCaloriesKcal: number;
  streakDay: number;
  completedAt: string; // ISO 8601
}
