import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../shared/services/alert.service';
import { WorkoutTemplate, WorkoutType } from '../core/models/workouts-tab.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WorkoutsTabService {

  readonly loading = signal(false);

  private http = inject(HttpClient);
  private alerts = inject(AlertService);
  private readonly baseUrl = `${environment.apiUrl}/api/workouts`;

  private normalizeType(raw: any): WorkoutType {
    const t = String(raw ?? '').trim();
    const allowed: WorkoutType[] = ['Strength', 'Circuit', 'HIIT', 'Crossfit', 'Cardio', 'Other'];
    return allowed.includes(t as WorkoutType) ? (t as WorkoutType) : 'Strength';
  }

  private mapTemplate(d: any): WorkoutTemplate {
    const type = this.normalizeType(d.type);
    return {
      uid: String(d.id),
      id: Number(d.id),
      title: d.title ?? '',
      type,
      durationMin: Number(d.durationMin ?? 0),
      caloriesEstimateKcal: Number(d.caloriesEstimateKcal ?? 0),
      notes: d.notes ?? '',
      exercises: type === 'Cardio' ? [] : (Array.isArray(d.exercises) ? d.exercises : []),
      cardio: type === 'Cardio'
        ? { km: Number(d.cardio?.km ?? 0), incline: Number(d.cardio?.incline ?? 0), notes: d.cardio?.notes ?? '' }
        : undefined,
      createdAt: d.createdAt ?? null,
      updatedAt: d.updatedAt ?? null,
    };
  }

  private buildBody(payload: Partial<WorkoutTemplate>): object {
    const type = this.normalizeType(payload.type);
    const isCardio = type === 'Cardio';
    return {
      title: (payload.title ?? '').toString(),
      type,
      durationMin: Number(payload.durationMin ?? 0),
      caloriesEstimateKcal: Number(payload.caloriesEstimateKcal ?? 0),
      notes: (payload.notes ?? '').toString(),
      exercises: isCardio ? [] : (Array.isArray(payload.exercises) ? payload.exercises : []),
      cardio: isCardio
        ? { km: Number((payload as any)?.cardio?.km ?? 0), incline: Number((payload as any)?.cardio?.incline ?? 0), notes: ((payload as any)?.cardio?.notes ?? '').toString() }
        : null,
    };
  }

  async getTemplate(docId: string): Promise<WorkoutTemplate | null> {
    if (!docId) return null;
    try {
      const dto = await firstValueFrom(this.http.get<any>(`${this.baseUrl}/${docId}`));
      return this.mapTemplate(dto);
    } catch (err) {
      this.alerts?.warn('Failed to load workout', (err as any)?.message ?? String(err));
      return null;
    }
  }

  async listTemplates(): Promise<WorkoutTemplate[]> {
    try {
      const dtos = await firstValueFrom(this.http.get<any[]>(this.baseUrl));
      return dtos.map(d => this.mapTemplate(d));
    } catch (err) {
      this.alerts?.warn('Failed to load workouts', (err as any)?.message ?? String(err));
      return [];
    }
  }

  async addTemplate(payload: Partial<WorkoutTemplate>): Promise<WorkoutTemplate | null> {
    try {
      const dto = await firstValueFrom(this.http.post<any>(this.baseUrl, this.buildBody(payload)));
      return this.mapTemplate(dto);
    } catch (err) {
      this.alerts?.warn('Failed to add workout', (err as any)?.message ?? String(err));
      return null;
    }
  }

  async updateTemplateByUid(docId: string, payload: Partial<WorkoutTemplate>): Promise<WorkoutTemplate | null> {
    if (!docId) return null;
    try {
      const dto = await firstValueFrom(this.http.put<any>(`${this.baseUrl}/${docId}`, this.buildBody(payload)));
      return this.mapTemplate(dto);
    } catch (err) {
      this.alerts?.warn('Failed to update workout', (err as any)?.message ?? String(err));
      return null;
    }
  }

  async deleteTemplateByUid(docId: string): Promise<boolean> {
    if (!docId) return false;
    try {
      await firstValueFrom(this.http.delete(`${this.baseUrl}/${docId}`));
      this.alerts?.success('Workout deleted');
      return true;
    } catch (err) {
      this.alerts?.warn('Failed to delete workout', (err as any)?.message ?? String(err));
      return false;
    }
  }
}
