export interface UserMetricsFirestore {
  bmi: number | null;
  bmiCat: string | null;
  bmr: number | null;
  goalCalories: number | null;
  tdee: number | null;
  waterL: number | null;
  lastCalculatedAt: string | null;
}

export interface UserFirestore {
  id: string;
  age: number | null;
  email: string | null;
  fullName: string | null;
  imageUrl: string | null;
  gender: 'male' | 'female' | 'other' | null;
  goal: 'lose' | 'gain' | 'maintain' | null;
  activity: string | null;

  heightCm: number | null;
  weightKg: number | null;

  metrics: UserMetricsFirestore | null;

  metricsUpdatedAt: any | null;
  updatedAt: any | null;
}
