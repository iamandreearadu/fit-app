export type MealType =
  | 'Breakfast'
  | 'Lunch'
  | 'Dinner'
  | 'Snack'
  | 'Pre-workout'
  | 'Post-workout'
  | 'Other';

export interface FoodItem {
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

export interface MealEntry {
  uid?: string;
  id: number;
  name: string;
  type: MealType;
  date: string;
  items: FoodItem[];
  totalGrams: number;
  totalCalories: number;
  totalProtein_g: number;
  totalCarbs_g: number;
  totalFats_g: number;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}
