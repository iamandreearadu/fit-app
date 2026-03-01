import { inject, Injectable, signal } from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { NutritionTabService } from "../services/nutrition-tab.service";
import { MealEntry } from "../models/nutrition-tab.model";

@Injectable({ 
  providedIn: 'root'
 })
 
export class NutritionTabFacade {

  private readonly svc = inject(NutritionTabService);

  private readonly _meals = signal<MealEntry[]>([]);
  private readonly _loading = signal(false);

  readonly meals$ = toObservable(this._meals);

  get meals(): MealEntry[] { return this._meals(); }
  get loading(): boolean { return this._loading(); }

  async loadMeals(): Promise<void> {
    this._loading.set(true);
    try {
      const meals = await this.svc.listMeals();
      this._meals.set(meals);
    } finally {
      this._loading.set(false);
    }
  }

  async saveMeal(payload: Partial<MealEntry>): Promise<void> {
    this._loading.set(true);
    try {
      if (payload.uid) {
        const updated = await this.svc.updateMeal(payload.uid, payload);
        if (updated) await this.loadMeals();
        return;
      }
      const created = await this.svc.addMeal(payload);
      if (created) await this.loadMeals();
    } finally {
      this._loading.set(false);
    }
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
}
