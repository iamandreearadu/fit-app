import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserStore } from '../store/user.store';
import { UserMetricsService } from '../services/user-metrics.service';
import { UserValidationService } from '../validations/user-validation.service';
import { DailyUserDataValidationService } from '../validations/daily-user-data-validation.service';
import { StreakData, UserProfile } from '../models/user.model';
import { UserService } from '../../api/user.service';
import { DailyUserData } from '../models/daily-user-data.model';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { DailyUserDataService } from '../services/daily-user-data.service';
import { NotificationHubService } from '../services/notification-hub.service';
import { NutritionTabFacade } from './nutrition-tab.facade';
import { WorkoutsTabFacade } from './workouts-tab.facade';
import { MealEntry } from '../models/nutrition-tab.model';
import { WorkoutTemplate } from '../models/workouts-tab.model';

@Injectable({ providedIn: 'root' })
export class UserFacade {

  private ls = inject(LocalStorageService);

  private userMetricsSrv = inject(UserMetricsService);
  private userSrv = inject(UserService);
  private dailyUserSrv = inject(DailyUserDataService);
  private notifHub = inject(NotificationHubService);

  private userValidationSrv = inject(UserValidationService);
  private dailyValidationSrv = inject(DailyUserDataValidationService);

  private userStore = inject(UserStore);

  // Delegated sub-facades — DailyUserDataComponent must use UserFacade as its sole dependency
  private readonly nutritionTabFacade = inject(NutritionTabFacade);
  private readonly workoutsTabFacade  = inject(WorkoutsTabFacade);

  readonly streak = signal<StreakData | null>(null);

  // ========== Getters ==========

  get todayDate() {
    return this.dailyUserSrv.todayDate;
  }

  get dailyData() {
    return this.dailyUserSrv.daily;
  }

  get dailyDataLoading() {
    return this.dailyUserSrv.loading;
  }

  get dailyDataValidation() {
    return this.dailyValidationSrv;
  }

  get dailyDataStats() {
    return this.dailyUserSrv.stats;
  }

  get metrics() {
    return this.userMetricsSrv.metrics;
  }

  get waterTargetFromMetrics() {
    return this.dailyUserSrv.waterTarget;
  }

  get waterProgress() {
    return this.dailyUserSrv.waterProgress;
  }

  get user() {
    return this.userStore.user;
  }

  get loading() {
    return this.userStore.loading;
  }

  get userValidation() {
    return this.userValidationSrv;
  }

  get history() {
    return this.dailyUserSrv.history;
  }

  get todaySummary() {
    return this.dailyUserSrv.todaySummary;
  }

  // ========== Initialization ==========

  constructor() {
    // Fix 5 — real-time streak badge update via SignalR streak-updated event.
    // Merges only current + isNewRecord; preserves longest so the Dashboard "Best" display is unaffected.
    this.notifHub.streakUpdated$.pipe(takeUntilDestroyed()).subscribe(p => {
      this.streak.update(s =>
        s ? { ...s, current: p.currentStreak, isNewRecord: p.isNewRecord } : s
      );
    });
  }

  public async loadCurrentUser(): Promise<void> {
    try {
      const profile = await this.userSrv.getCurrentUser();
      if (profile != null) {
        this.userStore.setUser(profile);
        this.ls.set('user_profile_v1', profile);
        this.userMetricsSrv.updateFromUser(profile);
      }
    } catch (err) {
      console.warn('Failed to load current user', err);
    }
  }


  // ========== Daily User Data operations ==========

  public async loadTodaySummary(): Promise<void> {
    const summary = await this.userSrv.getTodaySummary();
    this.dailyUserSrv.setTodaySummary(summary);
  }

  public async loadDaily(dateIso?: string): Promise<void> {
    this.dailyUserSrv.setLoading(true);
    try {
      const d = await this.userSrv.getDailyForDate(dateIso ?? this.todayDate);

      this.dailyUserSrv.setDailyFromBackend(d);
    } finally {
      this.dailyUserSrv.setLoading(false);
    }
  }

  public async saveDaily(patch: Partial<DailyUserData>): Promise<void> {
    this.dailyUserSrv.setLoading(true);
    try {
      this.dailyUserSrv.setDailyFromPatch(patch);

      const current = this.dailyUserSrv.daily();
      if (!current) {
        console.error('daily is null after setDailyFromPatch. This should not happen.');
        return;
      }

      await this.userSrv.saveDailyForDate(current.date, current);
    } finally {
      this.dailyUserSrv.setLoading(false);
    }
  }

  public async resetDailyForDate(date: string): Promise<void> {
    const today = this.dailyUserSrv.todayDate;
    const existing = this.dailyUserSrv.daily();

    if (date !== today) {
      return;
    }

    this.dailyUserSrv.resetDaily(date);

    if (!existing) {
      return;
    }

    const resetValue = this.dailyUserSrv.daily();
    if (!resetValue) return;

    await this.userSrv.saveDailyForDate(date, resetValue);
  }

  public async saveUserProfile(patch: Partial<UserProfile>): Promise<void> {
    this.userStore.setLoading(true);
    try {
      this.userStore.patchUser(patch);
      const current = this.userStore.user();

      if (!current) {
        console.error('user is null after patchUser. This should not happen.');
        return;
      }

      await this.userSrv.saveUserProfile(current);

      // Reload profile so metrics from backend are reflected
      await this.loadCurrentUser();
    } finally {
      this.userStore.setLoading(false);
    }
  }

  public async loadStreak(): Promise<void> {
    const data = await this.userSrv.getStreak();
    if (data) this.streak.set(data);
  }

  public async loadDailyHistory(): Promise<void> {
    try {
      const h = await this.userSrv.getAllPreviousData();
      this.dailyUserSrv.setHistory(h);

    } catch (err) {
      console.warn('Failed to load daily history', err);
    }
  }


  // ========== Nutrition delegations ==========

  /** Loaded meal list — same signal as NutritionTabFacade.meals */
  get meals(): MealEntry[] { return this.nutritionTabFacade.meals; }

  async loadMeals(): Promise<void> {
    await this.nutritionTabFacade.loadMeals();
  }

  async saveMeal(data: Partial<MealEntry>): Promise<void> {
    await this.nutritionTabFacade.saveMeal(data);
  }

  // ========== Workout template delegations ==========

  /** Loaded workout template list — same signal as WorkoutsTabFacade.templates */
  get workoutTemplates(): WorkoutTemplate[] { return this.workoutsTabFacade.templates; }

  async loadWorkoutTemplates(): Promise<void> {
    await this.workoutsTabFacade.loadTemplates();
  }

  // === Domain logic delegations ===

  public addWater(deltaL: number): void {
    this.dailyUserSrv.addWater(deltaL);
  }

  public addSteps(delta: number): void {
    this.dailyUserSrv.addSteps(delta);
  }

  public adjustCaloriesBurned(delta: number): void {
    this.dailyUserSrv.adjustCaloriesBurned(delta);
  }

}
