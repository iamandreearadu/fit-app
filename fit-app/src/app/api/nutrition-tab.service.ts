import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../shared/services/alert.service';
import { FoodItem, MealEntry, MealType } from '../core/models/nutrition-tab.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NutritionTabService {

  private http = inject(HttpClient);
  private alerts = inject(AlertService);
  private readonly baseUrl = `${environment.apiUrl}/api/nutrition`;

  private normalizeType(raw: any): MealType {
    const allowed: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout', 'Other'];
    const t = String(raw ?? '').trim();
    return allowed.includes(t as MealType) ? (t as MealType) : 'Other';
  }

  private mapMeal(d: any): MealEntry {
    const items: FoodItem[] = Array.isArray(d.items)
      ? d.items.map((i: any) => ({
          name: i.name ?? '',
          grams: Number(i.grams ?? 0),
          calories: Number(i.calories ?? 0),
          protein_g: Number(i.protein_g ?? 0),
          carbs_g: Number(i.carbs_g ?? 0),
          fats_g: Number(i.fats_g ?? 0),
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
      createdAt: d.createdAt ?? null,
      updatedAt: d.updatedAt ?? null,
    };
  }

  async listMeals(): Promise<MealEntry[]> {
    try {
      const dtos = await firstValueFrom(this.http.get<any[]>(this.baseUrl));
      return dtos.map(d => this.mapMeal(d));
    } catch (err) {
      this.alerts?.warn('Failed to load meals', (err as any)?.message ?? String(err));
      return [];
    }
  }

  async addMeal(payload: Partial<MealEntry>): Promise<MealEntry | null> {
    try {
      const body = {
        name: payload.name ?? '',
        type: this.normalizeType(payload.type),
        date: payload.date ?? new Date().toISOString().slice(0, 10),
        items: Array.isArray(payload.items) ? payload.items : [],
        notes: payload.notes ?? '',
      };
      const dto = await firstValueFrom(this.http.post<any>(this.baseUrl, body));
      return this.mapMeal(dto);
    } catch (err) {
      this.alerts?.warn('Failed to add meal', (err as any)?.message ?? String(err));
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
      };
      const dto = await firstValueFrom(this.http.put<any>(`${this.baseUrl}/${docId}`, body));
      return this.mapMeal(dto);
    } catch (err) {
      this.alerts?.warn('Failed to update meal', (err as any)?.message ?? String(err));
      return null;
    }
  }

  async deleteMeal(docId: string): Promise<boolean> {
    if (!docId) return false;
    try {
      await firstValueFrom(this.http.delete(`${this.baseUrl}/${docId}`));
      this.alerts?.success('Meal deleted');
      return true;
    } catch (err) {
      this.alerts?.warn('Failed to delete meal', (err as any)?.message ?? String(err));
      return false;
    }
  }
}
