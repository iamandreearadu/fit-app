export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  heightCm: number; 
  weightKg: number;
  age: number;
  gender: Sex
  activity: Activity;
  goal: Goal;
}


export type Sex = 'female' | 'male' | 'other'
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
export type Goal = 'maintain' | 'lose' | 'gain';
