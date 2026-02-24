import { Injectable, inject } from '@angular/core';
import { UserStore } from '../store/user.store';
import { UserMetricsService } from '../services/user-metrics.service';
import { UserValidationService } from '../validations/user-validation.service';
import { DailyUserDataValidationService } from '../validations/daily-user-data-validation.service';
import { UserProfile } from '../models/user.model';
import { UserService } from '../../api/user.service';
import { DailyUserData } from '../models/daily-user-data.model';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { DailyUserDataService } from '../services/daily-user-data.service';
import { mapFirestoreToProfile } from '../mappings/user-mapping';

@Injectable({ providedIn: 'root' })
export class UserFacade {

  private ls = inject(LocalStorageService);

  private userMetricsSrv = inject(UserMetricsService);
  private userSrv = inject(UserService);
  private dailyUserSrv = inject(DailyUserDataService);

  private userValidationSrv = inject(UserValidationService);
  private dailyValidationSrv = inject(DailyUserDataValidationService);

  private userStore = inject(UserStore);

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
    return this.userMetricsSrv.waterTarget;
  }

  get waterProgress() {
    return this.userMetricsSrv.waterProgress;
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

  get history(){
    return this.dailyUserSrv.history;
  }

  // ========== Initialization ==========

  constructor() { }

  public async loadCurrentUserFromFireStore(uid?: string): Promise<void> {
    try {
      const fsUser = uid ? await this.userSrv.getUserById(uid) : await this.userSrv.getCurrentUser();
      if (fsUser != null) {
        const mappedProfile = mapFirestoreToProfile(fsUser);
        this.userStore.setUser(mappedProfile);
        this.ls.set('user_profile_v1', mappedProfile);
        this.userMetricsSrv.updateFromUser(mappedProfile);
      }
    } catch (err) {
      console.warn('Failed to load current user from Firestore', err);
    }
  }


  // ========== Daily User Data operations ==========

  public async loadDailyFromFireStore(dateIso?: string): Promise<void> {
    this.dailyUserSrv.setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const d = await this.userSrv.getDailyForDate(dateIso ?? this.todayDate);

      this.dailyUserSrv.setDailyFromBackend(d);

      this.userMetricsSrv.updateWaterConsumed(d?.waterConsumedL ?? 0);
    } finally {
      this.dailyUserSrv.setLoading(false);
    }
  }

  public async saveDailyToFireStore(patch: Partial<DailyUserData>): Promise<void> {
    this.dailyUserSrv.setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.userStore.patchUser(patch);
      const current = this.userStore.user();

      if (!current) {
        console.error('user is null after patchUser. This should not happen.');
        return;
      }

      this.userMetricsSrv.updateFromUser(current);
      const metrics = this.userMetricsSrv.metrics();

      await this.userSrv.saveUserProfile(current, metrics);
    } finally {
      this.userStore.setLoading(false);
    }
  }

  public async loadDailyHistory(): Promise<void> {
    try {
      const h = await this.userSrv.getAllPreviousData();
      this.dailyUserSrv.setHistory(h);

    } catch (err) {
      console.warn("Failed to load daily history", err);
    }
  }


  // === Domain logic delegations ===

  public addWater(deltaL: number): void {
    this.dailyUserSrv.addWater(deltaL);
    // Sync the metrics service so waterProgress updates immediately
    const current = this.dailyUserSrv.daily();
    this.userMetricsSrv.updateWaterConsumed(current?.waterConsumedL ?? 0);
  }

  public addSteps(delta: number): void {
    this.dailyUserSrv.addSteps(delta);
  }

  public adjustCaloriesBurned(delta: number): void {
    this.dailyUserSrv.adjustCaloriesBurned(delta);
  }

}
