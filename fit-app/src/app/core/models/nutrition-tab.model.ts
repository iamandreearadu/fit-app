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
  source?: string;   // Fix 1: "search" | "recent" | "manual" | "ai_analyzer"
}

// Fix 1 — USDA food search result (per 100g values)
export interface FoodSearchResult {
  fdcId: number;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  servingSize?: string;
  brand?: string;
  dataType?: string;
}

// Fix 1 — recently used food item from user's history (actual gram-scaled values)
export interface RecentFoodItem {
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  source?: string;
  lastUsed: string;
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
  createdAt?: string;
  updatedAt?: string;
}

// Fix 3 — daily macro progress (totals vs TDEE-derived targets) from GET /api/nutrition/today/macro-progress
export interface MacroProgressDto {
  totalProtein:   number;
  targetProtein:  number;
  totalCarbs:     number;
  targetCarbs:    number;
  totalFat:       number;
  targetFat:      number;
  totalCalories:  number;
  targetCalories: number;
}
