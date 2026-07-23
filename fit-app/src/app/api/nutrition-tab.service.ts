import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../shared/services/alert.service';
import { FoodItem, FoodSearchResult, MacroProgressDto, MealEntry, MealType, RecentFoodItem } from '../core/models/nutrition-tab.model';
import { environment } from '../../environments/environment';

interface FoodItemDto extends Partial<FoodItem> {}
interface MealEntryDto extends Omit<Partial<MealEntry>, 'id' | 'items'> {
  id: number | string;
  items?: FoodItemDto[];
}
interface MealEntryListDto { items?: MealEntryDto[]; }

@Injectable({ providedIn: 'root' })
export class NutritionTabService {

  private http = inject(HttpClient);
  private alerts = inject(AlertService);
  private readonly baseUrl = `${environment.apiUrl}/api/nutrition`;

  private normalizeType(raw: unknown): MealType {
    const allowed: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout', 'Other'];
    const t = String(raw ?? '').trim();
    return allowed.includes(t as MealType) ? (t as MealType) : 'Other';
  }

  private mapMeal(d: MealEntryDto): MealEntry {
    const items: FoodItem[] = Array.isArray(d.items)
      ? d.items.map(i => ({
          name: i.name ?? '',
          grams: Number(i.grams ?? 0),
          calories: Number(i.calories ?? 0),
          protein_g: Number(i.protein_g ?? 0),
          carbs_g: Number(i.carbs_g ?? 0),
          fats_g: Number(i.fats_g ?? 0),
          source: i.source ?? undefined,   // Fix 1: pass through source
        }))
      : [];

    return {
      uid: String(d.id),
      id: Number(d.id),
      name: d.name ?? '',
      type: this.normalizeType(d.type),
      date: d.date ?? '',
      items,
      totalGrams: d.totalGrams ?? 0,
      totalCalories: d.totalCalories ?? 0,
      totalProtein_g: d.totalProtein_g ?? 0,
      totalCarbs_g: d.totalCarbs_g ?? 0,
      totalFats_g: d.totalFats_g ?? 0,
      notes: d.notes ?? '',
      isSavedMeal: d.isSavedMeal ?? false,
      isHiddenFromProfile: d.isHiddenFromProfile ?? true,
      createdAt: d.createdAt ?? undefined,
      updatedAt: d.updatedAt ?? undefined,
    };
  }

  async listMeals(pageSize = 20): Promise<MealEntry[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<MealEntryDto[] | MealEntryListDto>(this.baseUrl, {
          params: { pageSize: Math.min(Math.max(pageSize, 1), 50) },
        })
      );
      const dtos = Array.isArray(res) ? res : (res.items ?? []);
      return dtos.map(d => this.mapMeal(d));
    } catch (err) {
      this.alerts?.warn('Failed to load meals');
      throw err;
    }
  }

  async listMealsForDate(date: string): Promise<MealEntry[]> {
    const res = await firstValueFrom(
      this.http.get<MealEntryDto[] | MealEntryListDto>(this.baseUrl, {
        params: { date, pageSize: 50 },
      })
    );
    const dtos = Array.isArray(res) ? res : (res.items ?? []);
    return dtos.map(d => this.mapMeal(d));
  }

  async listSavedMeals(): Promise<MealEntry[]> {
    const dtos = await firstValueFrom(
      this.http.get<MealEntryDto[]>(`${this.baseUrl}/saved`)
    );
    return dtos.map(d => this.mapMeal(d));
  }

  async addMeal(payload: Partial<MealEntry>): Promise<MealEntry | null> {
    try {
      const body = {
        name: payload.name ?? '',
        type: this.normalizeType(payload.type),
        date: payload.date ?? new Date().toISOString().slice(0, 10),
        items: Array.isArray(payload.items) ? payload.items : [],
        notes: payload.notes ?? '',
        isSavedMeal: payload.isSavedMeal ?? false,
      };
      const dto = await firstValueFrom(this.http.post<MealEntryDto>(this.baseUrl, body));
      return this.mapMeal(dto);
    } catch (err) {
      this.alerts?.warn('Failed to add meal');
      return null;
    }
  }

  async updateMeal(docId: string, payload: Partial<MealEntry>): Promise<MealEntry | null> {
    if (!docId) return null;
    try {
      const body = {
        name: payload.name ?? '',
        type: this.normalizeType(payload.type),
        date: payload.date ?? new Date().toISOString().slice(0, 10),
        items: Array.isArray(payload.items) ? payload.items : [],
        notes: payload.notes ?? '',
        isSavedMeal: payload.isSavedMeal ?? false,
      };
      const dto = await firstValueFrom(this.http.put<MealEntryDto>(`${this.baseUrl}/${docId}`, body));
      return this.mapMeal(dto);
    } catch (err) {
      this.alerts?.warn('Failed to update meal');
      return null;
    }
  }

  async deleteMeal(docId: string, notify = true): Promise<boolean> {
    if (!docId) return false;
    try {
      await firstValueFrom(this.http.delete(`${this.baseUrl}/${docId}`));
      if (notify) this.alerts?.success('Meal deleted');
      return true;
    } catch (err) {
      if (notify) this.alerts?.warn('Failed to delete meal');
      return false;
    }
  }

  // Fix 1 — USDA food database search (proxied through backend, per 100g values)
  async searchFoods(query: string): Promise<FoodSearchResult[]> {
    try {
      const params = { q: query.trim(), pageSize: 10 };
      return await firstValueFrom(
        this.http.get<FoodSearchResult[]>(`${this.baseUrl}/foods/search`, { params })
      );
    } catch {
      return [];
    }
  }

  // Fix 1 — last 10 distinct foods logged by the authenticated user
  async getRecentFoods(): Promise<RecentFoodItem[]> {
    try {
      return await firstValueFrom(
        this.http.get<RecentFoodItem[]>(`${this.baseUrl}/foods/recent`)
      );
    } catch {
      return [];
    }
  }

  // Fix 3 — today's macro totals vs TDEE-derived gram targets
  async getTodayMacroProgress(): Promise<MacroProgressDto | null> {
    try {
      return await firstValueFrom(
        this.http.get<MacroProgressDto>(`${this.baseUrl}/today/macro-progress`)
      );
    } catch {
      return null;
    }
  }
}
