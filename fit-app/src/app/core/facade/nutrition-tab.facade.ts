import { inject, Injectable, signal } from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { NutritionTabService } from "../../api/nutrition-tab.service";
import { FoodSearchResult, MacroProgressDto, MealEntry, RecentFoodItem } from "../models/nutrition-tab.model";

@Injectable({ 
  providedIn: 'root'
 })
 
export class NutritionTabFacade {

  private readonly svc = inject(NutritionTabService);

  private readonly _meals = signal<MealEntry[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Fix 1 — food search signals
  private readonly _recentFoods = signal<RecentFoodItem[]>([]);
  private readonly _recentLoading = signal(false);

  readonly meals$ = toObservable(this._meals);

  get meals(): MealEntry[] { return this._meals(); }
  get loading(): boolean { return this._loading(); }

  /** Non-null when the last loadMeals() call failed — used by NutritionGuidedEmptyComponent. */
  readonly error = this._error.asReadonly();

  // Fix 1 — public readonly signals for food search
  readonly recentFoods = this._recentFoods.asReadonly();
  readonly recentLoading = this._recentLoading.asReadonly();

  // Fix 3 — macro progress signal (totals vs targets) refreshed after each meal save
  private readonly _macroProgress = signal<MacroProgressDto | null>(null);
  readonly macroProgress = this._macroProgress.asReadonly();

  async loadMeals(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const meals = await this.svc.listMeals();
      this._meals.set(meals);
    } catch {
      this._error.set('Failed to load meals. Please try again.');
    } finally {
      this._loading.set(false);
    }
  }

  async saveMeal(payload: Partial<MealEntry>): Promise<MealEntry | null> {
    this._loading.set(true);
    try {
      if (payload.uid) {
        const updated = await this.svc.updateMeal(payload.uid, payload);
        if (updated) await this.loadMeals();
        return updated;
      }
      const created = await this.svc.addMeal(payload);
      if (created) await this.loadMeals();
      return created;
    } finally {
      this._loading.set(false);
    }
  }

  // Fix 3 — refresh today's macro progress after a meal save
  async refreshMacroProgress(): Promise<void> {
    const progress = await this.svc.getTodayMacroProgress();
    this._macroProgress.set(progress);
  }

  async deleteMeal(uid?: string): Promise<void> {
    if (!uid) return;
    this._loading.set(true);
    try {
      const ok = await this.svc.deleteMeal(uid);
      if (ok) await this.loadMeals();
    } finally {
      this._loading.set(false);
    }
  }

  // Fix 1 — load last 10 distinct foods for the current user
  async loadRecentFoods(): Promise<void> {
    this._recentLoading.set(true);
    try {
      const foods = await this.svc.getRecentFoods();
      this._recentFoods.set(foods);
    } catch {
      // silent — recent foods is non-critical; stays []
    } finally {
      this._recentLoading.set(false);
    }
  }

  // Fix 1 — proxy USDA search; returns results directly to the calling component
  async searchFoods(query: string): Promise<FoodSearchResult[]> {
    try {
      return await this.svc.searchFoods(query);
    } catch {
      return [];
    }
  }
}
