import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../shared/services/alert.service';
import { UserProfile } from '../core/models/user.model';
import { DailyUserData } from '../core/models/daily-user-data.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {

  private http = inject(HttpClient);
  private alerts = inject(AlertService);
  private readonly baseUrl = environment.apiUrl;

  public async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const dto = await firstValueFrom(
        this.http.get<any>(`${this.baseUrl}/api/users/me`)
      );
      return this.mapDtoToProfile(dto);
    } catch (err) {
      this.alerts.warn('Failed to load user profile', String(err));
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
        })
      );
      this.alerts.success('Profile saved');
    } catch (err) {
      this.alerts.warn('Failed to save profile', String(err));
    }
  }

  public async getDailyForDate(dateIso: string): Promise<DailyUserData | null> {
    try {
      const dto = await firstValueFrom(
        this.http.get<any>(`${this.baseUrl}/api/daily?date=${dateIso}`)
      );
      return this.mapDtoToDaily(dto);
    } catch (err: any) {
      if (err?.status === 404) return null;
      this.alerts.warn('Failed to load daily data', String(err));
      return null;
    }
  }

  public async saveDailyForDate(dateIso: string, data: DailyUserData): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/api/daily`, {
          date: data.date,
          activityType: data.activityType,
          waterConsumedL: data.waterConsumedL,
          steps: data.steps,
          stepTarget: data.stepTarget,
          macrosPct: data.macrosPct,
          caloriesBurned: data.caloriesBurned,
          caloriesIntake: data.caloriesIntake,
        })
      );
    } catch (err) {
      this.alerts.warn('Failed to save daily data', String(err));
    }
  }

  public async getAllPreviousData(): Promise<DailyUserData[]> {
    try {
      const dtos = await firstValueFrom(
        this.http.get<any[]>(`${this.baseUrl}/api/daily/history`)
      );
      const todayIso = new Date().toISOString().slice(0, 10);
      return dtos
        .map(d => this.mapDtoToDaily(d))
        .filter(d => d.date !== todayIso);
    } catch (err) {
      this.alerts.warn('Failed to load daily history', String(err));
      return [];
    }
  }

  private mapDtoToProfile(dto: any): UserProfile {
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
    };
  }

  private mapDtoToDaily(d: any): DailyUserData {
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
