export interface MealMacros {
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  calories_kcal?: number;
  items?: Array<{ name: string; confidence?: number }>;
}