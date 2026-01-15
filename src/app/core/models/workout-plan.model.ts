export interface WorkoutPlan {
  id: string;
  title: string;
  subtitle: string;
  type: 'home' | 'gym' | 'hybrid';
  level: 'beginner' | 'intermediate' | 'advanced';
  weeks: number;
  price: number;
  image?: string;
  perks: string[];
};