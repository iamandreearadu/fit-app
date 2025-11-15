import { Injectable, computed, signal } from '@angular/core';
import { UserStore } from '../store/user.store';
import { UserMetricsService } from '../services/user-metrics.service';
import { UserFitMetrics } from '../models/user-fit-metrics.model';
import { UserValidationService } from '../validations/user-validation.service';
import { DailyUserDataValidationService } from '../validations/daily-user-data-validation.service';
import { UserProfile } from '../models/user.model';
import { UserService } from '../../api/user.service';
import { DailyUserDataService } from '../services/daily-user-data.service';
import { DailyUserData } from '../models/daily-user-data.model';

@Injectable({ providedIn: 'root' })
export class UserFacade {
  private _metrics = computed<UserFitMetrics | null>(() => null);
  // daily data signals & derived values
  private _daily = signal<DailyUserData | null>(null);
  private _dailyLoading = signal(false);

  // derived/computed values for the UI
  readonly totalCalories = computed(() => {
    const d = this._daily();
    const macros = d?.macrosPct ?? { protein: 0, carbs: 0, fats: 0 };
    const p = Number(macros.protein ?? 0);
    const c = Number(macros.carbs ?? 0);
    const f = Number(macros.fats ?? 0);
    return Math.round(p * 4 + c * 4 + f * 9);
  });

  readonly caloriesBurned = computed(() => Number(this._daily()?.caloriesBurned ?? 0));

  readonly netCalories = computed(() => Math.max(0, this.totalCalories() - this.caloriesBurned()));

  readonly waterConsumed = computed(() => Number(this._daily()?.waterConsumedL ?? 0));

  readonly waterTargetFromMetrics = computed(() => this._metrics()?.waterL ?? 0);

  readonly waterProgress = computed(() => {
    const target = this.waterTargetFromMetrics();
    if (!target) return 0;
    const pct = (this.waterConsumed() / target) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  });

  readonly steps = computed(() => Number(this._daily()?.steps ?? 0));

  readonly stepTarget = computed(() => Number(this._daily()?.stepTarget ?? 3000));

  readonly stepsProgress = computed(() => {
    const target = this.stepTarget();
    const pct = (this.steps() / target) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  });

  constructor(
    private store: UserStore,
    private userService: UserService,
    private metricsSvc: UserMetricsService,
    private validation: UserValidationService,
    private dailyValidation: DailyUserDataValidationService,
    private dailySvc: DailyUserDataService
  ) {
    // initialize computed now that services are available
    this._metrics = computed<UserFitMetrics | null>(() => {
      const u = this.store.user();
      if (!u) return null;
      return this.metricsSvc.compute(u);
    });
  }

  // expose daily validators via facade so components can build form with rules
  getDailyValidators() {
    return this.dailyValidation;
  }

  // expose small helpers for daily user data so components can remain thin
  get todayDate(): string {
    return this.dailySvc.todayDate;
  }

  async getDailyData(): Promise<DailyUserData | null> {
    // keep the internal signal in sync when fetched directly
    const d = await this.dailySvc.getDailyUserData();
    this._daily.set(d);
    return d;
  }

  async setDailyData(patch: Partial<DailyUserData>): Promise<DailyUserData> {
    // persist and update internal signal
    const updated = await this.dailySvc.setDailyUserData(patch);
    this._daily.set(updated);
    return updated;
  }

  // signal accessors for components
  get daily() {
    return this._daily;
  }

  get dailyLoading() {
    return this._dailyLoading;
  }

  async loadDaily() {
    this._dailyLoading.set(true);
    try {
      const d = await this.dailySvc.getDailyUserData();
      this._daily.set(d);
    } finally {
      this._dailyLoading.set(false);
    }
  }

  async saveDaily(patch: Partial<DailyUserData>) {
    this._dailyLoading.set(true);
    try {
      const updated = await this.dailySvc.setDailyUserData(patch);
      this._daily.set(updated);
      return updated;
    } finally {
      this._dailyLoading.set(false);
    }
  }

  // UI helpers that mutate the daily signal and persist
  async addWater(deltaL: number) {
    const cur = this._daily() ?? {
      date: this.todayDate,
      activityType: 'Rest Day',
      waterConsumedL: 0,
      steps: 0,
      stepTarget: 3000,
      macrosPct: { protein: 0, carbs: 0, fats: 0 },
      caloriesBurned: 0,
      caloriesIntake: 0,
      caloriesTotal: 0,
    } as DailyUserData;
    const next = Math.max(0, Number(cur.waterConsumedL ?? 0) + deltaL);
    const updated: Partial<DailyUserData> = { ...cur, waterConsumedL: +next.toFixed(2) };
    return this.saveDaily(updated);
  }

  async addSteps(delta: number) {
    const cur = this._daily() ?? { steps: 0 } as DailyUserData;
    const next = Math.max(0, Number(cur.steps ?? 0) + delta);
    const updated: Partial<DailyUserData> = { ...cur, steps: next };
    return this.saveDaily(updated);
  }

  async adjustCaloriesBurned(delta: number) {
    const cur = this._daily() ?? { caloriesBurned: 0 } as DailyUserData;
    const next = Math.max(0, Number(cur.caloriesBurned ?? 0) + delta);
    const updated: Partial<DailyUserData> = { ...cur, caloriesBurned: next };
    return this.saveDaily(updated);
  }

  // expose validators via facade so components stay thin
  getValidators() {
    return this.validation;
  }

  get user() {
    return this.store.user;
  }

  get loading() {
    return this.store.loading;
  }

  get metrics() {
    return this._metrics;
  }

  hydrateFromLocalStorage() {
    this.store.hydrateFromLocalStorage();
  }

  async loadUser() {
    this.loading.set(true);
    try {
      const u = await this.userService.getCurrentUser();
      this.store.setUser(u);
    } finally {
      this.loading.set(false);
    }
  }

  async updateProfile(patch: Partial<UserProfile>) {
    this.loading.set(true);
    try {
      const updated = await this.userService.updateProfile(patch);
      this.store.setUser(updated);
      return updated;
    }
    catch(error)
    {
      console.error('Failed to update profile', error);
      throw error;
    }
    finally {
      setTimeout(() => {
        this.loading.set(false);
      }, 2000);
    }
  }



  // small helper to format validation messages from validation service
  getValidationMessage(controlName: string, errors: any) {
    return this.validation.getErrorMessage(controlName, errors);
  }
}
