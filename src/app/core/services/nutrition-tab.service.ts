import { inject, Injectable } from "@angular/core";
import { Firestore } from "@angular/fire/firestore";
import {
  collection,
  doc,
  getDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { Auth } from "@angular/fire/auth";
import { AlertService } from "../../shared/services/alert.service";
import { FoodItem, MealEntry, MealType } from "../models/nutrition-tab.model";

@Injectable({ providedIn: 'root' })
export class NutritionTabService {

  private firestore = inject(Firestore);
  private alerts = inject(AlertService);
  private auth = inject(Auth);

  private uidOrNull(): string | null {
    return (this.auth.currentUser as any)?.uid ?? null;
  }

  private ensureAuth(): string | null {
    const uid = this.uidOrNull();
    if (!uid) {
      this.alerts?.warn("You must be signed in to manage meals");
      return null;
    }
    return uid;
  }

  private normalizeType(raw: any): MealType {
    const allowed: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout', 'Other'];
    const t = String(raw ?? '').trim();
    return allowed.includes(t as MealType) ? (t as MealType) : 'Other';
  }

  private calcTotals(items: FoodItem[]) {
    return items.reduce(
      (acc, item) => ({
        totalGrams:    acc.totalGrams    + Number(item.grams    ?? 0),
        totalCalories: acc.totalCalories + Number(item.calories ?? 0),
        totalProtein_g: acc.totalProtein_g + Number(item.protein_g ?? 0),
        totalCarbs_g:   acc.totalCarbs_g   + Number(item.carbs_g   ?? 0),
        totalFats_g:    acc.totalFats_g    + Number(item.fats_g    ?? 0),
      }),
      { totalGrams: 0, totalCalories: 0, totalProtein_g: 0, totalCarbs_g: 0, totalFats_g: 0 }
    );
  }

  private mapMeal(s: any): MealEntry {
    const d = s.data?.() ?? s.data ?? {};
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
      uid: s.id,
      id: Number(d.id ?? Date.now()),
      name: d.name ?? '',
      type: this.normalizeType(d.type),
      date: d.date ?? '',
      items,
      ...this.calcTotals(items),
      notes: d.notes ?? '',
      createdAt: d.createdAt ?? null,
      updatedAt: d.updatedAt ?? null,
    };
  }

  async listMeals(): Promise<MealEntry[]> {
    const uid = this.ensureAuth();
    if (!uid) return [];
    try {
      const coll = collection(this.firestore as any, `users/${uid}/meals`);
      const q = query(coll as any, orderBy("updatedAt", "desc")) as any;
      const snaps = await getDocs(q as any);
      const meals: MealEntry[] = [];
      snaps.forEach((s: any) => meals.push(this.mapMeal(s)));
      return meals;
    } catch (err) {
      this.alerts?.warn("Failed to load meals", (err as any)?.message ?? String(err));
      return [];
    }
  }

  async addMeal(payload: Partial<MealEntry>): Promise<MealEntry | null> {
    const uid = this.ensureAuth();
    if (!uid) return null;
    try {
      const items: FoodItem[] = Array.isArray(payload.items) ? payload.items : [];
      const coll = collection(this.firestore as any, `users/${uid}/meals`);
      const data = {
        id: Date.now(),
        name: payload.name ?? '',
        type: this.normalizeType(payload.type),
        date: payload.date ?? new Date().toISOString().slice(0, 10),
        items,
        ...this.calcTotals(items),
        notes: payload.notes ?? '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const ref = await addDoc(coll as any, data);
      const snap = await getDoc(ref as any);
      if (!snap.exists()) return null;
      return this.mapMeal({ id: ref.id, data: () => snap.data() });
    } catch (err) {
      this.alerts?.warn("Failed to add meal", (err as any)?.message ?? String(err));
      return null;
    }
  }

  async updateMeal(docId: string, payload: Partial<MealEntry>): Promise<MealEntry | null> {
    const uid = this.ensureAuth();
    if (!uid || !docId) return null;
    try {
      const ref = doc(this.firestore as any, `users/${uid}/meals/${docId}`) as any;
      const items: FoodItem[] = Array.isArray(payload.items) ? payload.items : [];
      const patch = {
        name: payload.name ?? '',
        type: this.normalizeType(payload.type),
        date: payload.date ?? new Date().toISOString().slice(0, 10),
        items,
        ...this.calcTotals(items),
        notes: payload.notes ?? '',
        updatedAt: serverTimestamp(),
      };
      await updateDoc(ref, patch);
      const snap = await getDoc(ref as any);
      if (!snap.exists()) return null;
      return this.mapMeal({ id: ref.id, data: () => snap.data() });
    } catch (err) {
      this.alerts?.warn("Failed to update meal", (err as any)?.message ?? String(err));
      return null;
    }
  }

  async deleteMeal(docId: string): Promise<boolean> {
    const uid = this.ensureAuth();
    if (!uid || !docId) return false;
    try {
      await deleteDoc(doc(this.firestore as any, `users/${uid}/meals/${docId}`));
      this.alerts?.success("Meal deleted");
      return true;
    } catch (err) {
      this.alerts?.warn("Failed to delete meal", (err as any)?.message ?? String(err));
      return false;
    }
  }
}
