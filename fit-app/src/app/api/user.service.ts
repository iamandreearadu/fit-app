import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../shared/services/alert.service';
import { DailyTargets, StreakData, UserProfile } from '../core/models/user.model';
import { DailyEntrySummary, DailyUserData } from '../core/models/daily-user-data.model';
import { environment } from '../../environments/environment';
import { HttpErrorResponse } from '@angular/common/http';

type UserProfileDto = Partial<UserProfile> & Pick<UserProfile, 'id' | 'email' | 'fullName' | 'gender' | 'age' | 'heightCm' | 'weightKg' | 'goal' | 'activity'>;
type DailyUserDataDto = Partial<DailyUserData> & Pick<DailyUserData, 'date'>;
interface DailyHistoryDto { items?: DailyUserDataDto[]; }

@Injectable({ providedIn: 'root' })
export class UserService {

  private http = inject(HttpClient);
  private alerts = inject(AlertService);
  private readonly baseUrl = environment.apiUrl;

  public async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const dto = await firstValueFrom(
        this.http.get<UserProfileDto>(`${this.baseUrl}/api/users/me`)
      );
      return this.mapDtoToProfile(dto);
    } catch (err) {
      this.alerts.warn('Failed to load user profile');
      return null;
    }
  }

  public async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      await firstValueFrom(
        this.http.put(`${this.baseUrl}/api/users/me`, {
          fullName: profile.fullName,
          gender: profile.gender,
          age: profile.age,
          heightCm: profile.heightCm,
          weightKg: profile.weightKg,
          goal: profile.goal,
          activity: profile.activity,
          imageUrl: profile.imageUrl,
          onboardingCompleted: profile.onboardingCompleted,
          dietaryPreference: profile.dietaryPreference ?? null,
        })
      );
      this.alerts.success('Profile saved');
    } catch (err) {
      this.alerts.warn('Failed to save profile');
    }
  }

  public async saveDailyTargets(values: {
    calories: number | null;
    waterL: number | null;
    steps: number | null;
  }): Promise<DailyTargets | null> {
    try {
      return await firstValueFrom(
        this.http.put<DailyTargets>(`${this.baseUrl}/api/users/me/targets`, values)
      );
    } catch (err) {
      this.alerts.warn('Daily targets could not be saved');
      return null;
    }
  }

  public async resetDailyTargets(): Promise<DailyTargets | null> {
    try {
      return await firstValueFrom(
        this.http.delete<DailyTargets>(`${this.baseUrl}/api/users/me/targets`)
      );
    } catch {
      this.alerts.warn('Daily targets could not be reset');
      return null;
    }
  }

  public async deleteAccount(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${this.baseUrl}/api/users/me`)
      );
      return true;
    } catch {
      this.alerts.warn('Your account could not be deleted. Please try again.');
      return false;
    }
  }

  public async getStreak(): Promise<StreakData | null> {
    try {
      return await firstValueFrom(
        this.http.get<StreakData>(`${this.baseUrl}/api/daily/streak`)
      );
    } catch {
      return null;
    }
  }

  public async getDailyForDate(dateIso: string): Promise<DailyUserData | null> {
    try {
      const dto = await firstValueFrom(
        this.http.get<DailyUserDataDto>(`${this.baseUrl}/api/daily?date=${dateIso}`)
      );
      return this.mapDtoToDaily(dto);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 404) return null;
      this.alerts.warn('Failed to load daily data');
      return null;
    }
  }

  public async getTodaySummary(): Promise<DailyEntrySummary | null> {
    try {
      return await firstValueFrom(
        this.http.get<DailyEntrySummary>(`${this.baseUrl}/api/daily/today/summary`)
      );
    } catch {
      this.alerts.warn('Failed to load daily summary');
      return null;
    }
  }

  public async saveDailyForDate(dateIso: string, data: DailyUserData): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/api/daily`, {
          date: dateIso,
          activityType: data.activityType,
          waterConsumedL: data.waterConsumedL,
          steps: data.steps,
          stepTarget: data.stepTarget,
          macrosPct: data.macrosPct,
          caloriesBurned: data.caloriesBurned,
          // caloriesIntake REMOVED — now server-computed from MealEntries (Fix 10)
        })
      );
    } catch (err) {
      this.alerts.warn('Failed to save daily data');
    }
  }

  public async getAllPreviousData(): Promise<DailyUserData[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<DailyUserDataDto[] | DailyHistoryDto>(`${this.baseUrl}/api/daily/history`)
      );
      const dtos = Array.isArray(res) ? res : (res.items ?? []);
      const todayIso = new Date().toISOString().slice(0, 10);
      return dtos
        .map(d => this.mapDtoToDaily(d))
        .filter(d => d.date !== todayIso);
    } catch (err) {
      this.alerts.warn('Failed to load daily history');
      return [];
    }
  }

  private mapDtoToProfile(dto: UserProfileDto): UserProfile {
    return {
      id: dto.id,
      email: dto.email,
      fullName: dto.fullName,
      gender: dto.gender,
      age: dto.age,
      heightCm: dto.heightCm,
      weightKg: dto.weightKg,
      goal: dto.goal,
      activity: dto.activity,
      imageUrl: dto.imageUrl,
      onboardingCompleted: dto.onboardingCompleted ?? false,
      dietaryPreference: dto.dietaryPreference ?? undefined,
      metrics: dto.metrics,
      targets: dto.targets ?? {
        recommendedCalories: dto.metrics?.goalCalories ?? 2000,
        recommendedWaterL: dto.metrics?.waterL ?? 2,
        recommendedSteps: 8000,
        customCalories: null,
        customWaterL: null,
        customSteps: null,
        effectiveCalories: dto.metrics?.goalCalories ?? 2000,
        effectiveWaterL: dto.metrics?.waterL ?? 2,
        effectiveSteps: 8000,
      },
    };
  }

  private mapDtoToDaily(d: DailyUserDataDto): DailyUserData {
    return {
      date: d.date,
      activityType: d.activityType ?? 'Rest Day',
      caloriesBurned: d.caloriesBurned ?? 0,
      caloriesIntake: d.caloriesIntake ?? 0,
      caloriesTotal: d.caloriesTotal ?? 0,
      waterConsumedL: d.waterConsumedL ?? 0,
      steps: d.steps ?? 0,
      stepTarget: d.stepTarget ?? 3000,
      macrosPct: {
        protein: d.macrosPct?.protein ?? 0,
        carbs: d.macrosPct?.carbs ?? 0,
        fats: d.macrosPct?.fats ?? 0,
      },
    };
  }
}
