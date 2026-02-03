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

  createdAt?: any;
  updatedAt?: any;
}
