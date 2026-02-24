import { computed, Injectable, signal } from "@angular/core";
import { DailyUserDataStats, DailyUserData } from "../models/daily-user-data.model";

@Injectable({
  providedIn: 'root'
})
export class DailyUserDataService {

  readonly todayDate = new Date().toISOString().slice(0, 10);

  // ----------------- STATE (signals) -----------------

  private readonly _daily = signal<DailyUserData | null>(null);
  private readonly _loading = signal(false);
  private readonly _history = signal<DailyUserData[]>([]);

  readonly daily = this._daily.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly history = this._history.asReadonly();

  readonly stats = computed<DailyUserDataStats>(() =>
    this.computeStats(this._daily())
  );


  // ----------------- PUBLIC API -----------------


  public setDailyFromPatch(patch: Partial<DailyUserData>): void {
    const existing = this._daily();
    const complete = this.buildComplete(patch, existing ?? undefined);
    this._daily.set(complete);
  }

  public setDailyFromBackend(d: DailyUserData | null): void {
    const complete = this.buildComplete(d ?? {}, d ?? undefined);
    this._daily.set(complete);
  }

  public resetDaily(date: string): void {
    this._daily.set({
      date: date,
      activityType: 'Rest Day',
      waterConsumedL: 0,
      steps: 0,
      stepTarget: 3000,
      macrosPct: { protein: 0, carbs: 0, fats: 0 },
      caloriesIntake: 0,
      caloriesBurned: 0,
      caloriesTotal: 0
    });
  }

  public setLoading(flag: boolean): void {
    this._loading.set(flag);
  }

  public setHistory(list: DailyUserData[]): void {
    this._history.set(list);
  }

  // ----------------- PUBLIC API (mutations) -----------------

  public addWater(deltaL: number): void {
    const current = this._daily();
    if (!current) return;

    const next = Math.max(0, Number(current.waterConsumedL ?? 0) + deltaL);
    this.setDailyFromPatch({
      date: current.date,
      waterConsumedL: +next.toFixed(2),
    });
  }

  public addSteps(delta: number): void {
    const current = this._daily();
    if (!current) return;

    const next = Math.max(0, Number(current.steps ?? 0) + delta);
    this.setDailyFromPatch({
      date: current.date,
      steps: next,
    });
  }

  public adjustCaloriesBurned(delta: number): void {
    const current = this._daily();
    if (!current) return;

    const next = Math.max(0, Number(current.caloriesBurned ?? 0) + delta);
    this.setDailyFromPatch({
      date: current.date,
      caloriesBurned: next,
    });
  }

  // ----------------- DOMAIN LOGIC (pure) -----------------

  private caloriesFromMacros(protein: number, carbs: number, fats: number): number {
    return protein * 4 + carbs * 4 + fats * 9;
  }

  private caloriesTotal(intake: number, burned: number): number {
    return Math.max(0, intake - burned);
  }

  private buildComplete(
    patch: Partial<DailyUserData> = {},
    existing?: DailyUserData
  ): DailyUserData {

    if (!patch.date && !existing?.date) {
      patch.date = this.todayDate;
    }

    const baseDate = patch.date ?? existing!.date!;

    const macros = {
      protein: Number(patch.macrosPct?.protein ?? existing?.macrosPct?.protein ?? 0),
      carbs: Number(patch.macrosPct?.carbs ?? existing?.macrosPct?.carbs ?? 0),
      fats: Number(patch.macrosPct?.fats ?? existing?.macrosPct?.fats ?? 0),
    };

    const hasMacrosInPatch =
      !!patch.macrosPct &&
      (
        patch.macrosPct.protein !== undefined ||
        patch.macrosPct.carbs !== undefined ||
        patch.macrosPct.fats !== undefined
      );

    const caloriesIntake = hasMacrosInPatch
      ? this.caloriesFromMacros(macros.protein, macros.carbs, macros.fats)
      : Number(
          patch.caloriesIntake
          ?? existing?.caloriesIntake
          ?? this.caloriesFromMacros(macros.protein, macros.carbs, macros.fats)
        );

    const caloriesBurned = Number(patch.caloriesBurned ?? existing?.caloriesBurned ?? 0);

    const result: DailyUserData = {
      date: baseDate,
      activityType: patch.activityType ?? existing?.activityType ?? 'Rest Day',
      waterConsumedL: Number(patch.waterConsumedL ?? existing?.waterConsumedL ?? 0),
      steps: Number(patch.steps ?? existing?.steps ?? 0),
      stepTarget: Number(patch.stepTarget ?? existing?.stepTarget ?? 3000),
      macrosPct: macros,
      caloriesIntake: caloriesIntake,
      caloriesBurned: caloriesBurned,
      caloriesTotal: this.caloriesTotal(caloriesIntake, caloriesBurned),
    };

    if (result.caloriesIntake == null) {
      result.caloriesIntake = this.caloriesFromMacros(macros.protein, macros.carbs, macros.fats);
      result.caloriesTotal = this.caloriesTotal(result.caloriesIntake, caloriesBurned);
    }

    return result;
  }

  private computeStats(d: DailyUserData | null): DailyUserDataStats {
    if (!d) {
      return {
        totalCalories: 0,
        caloriesBurned: 0,
        netCalories: 0,
        caloriesIntake: 0,
        waterConsumedL: 0,
        steps: 0,
        stepTarget: 3000,
        stepsProgress: 0,
      };
    }

    const macros = d.macrosPct ?? { protein: 0, carbs: 0, fats: 0 };
    const protein = Number(macros.protein ?? 0);
    const carbs = Number(macros.carbs ?? 0);
    const fats = Number(macros.fats ?? 0);

    const caloriesIntake = d.caloriesIntake ?? this.caloriesFromMacros(protein, carbs, fats);
    const caloriesBurned = Number(d.caloriesBurned ?? 0);
    const totalCalories = Math.round(this.caloriesFromMacros(protein, carbs, fats));
    const netCalories = Math.max(0, this.caloriesTotal(caloriesIntake, caloriesBurned));

    const waterConsumedL = Number(d.waterConsumedL ?? 0);
    const steps = Number(d.steps ?? 0);
    const stepTarget = Number(d.stepTarget ?? 3000);

    const stepsProgress = stepTarget
      ? Math.max(0, Math.min(100, Math.round((steps / stepTarget) * 100)))
      : 0;

    return {
      totalCalories,
      caloriesBurned,
      netCalories,
      caloriesIntake,
      waterConsumedL,
      steps,
      stepTarget,
      stepsProgress,
    };
  }

}
