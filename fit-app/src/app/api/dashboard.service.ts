import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DashboardTodayDto, AiInsightDto } from '../core/models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getToday(): Observable<DashboardTodayDto> {
    return this.http.get<DashboardTodayDto>(`${this.apiUrl}/api/dashboard/today`);
  }

  getAiInsight(): Observable<AiInsightDto> {
    return this.http.get<AiInsightDto>(`${this.apiUrl}/api/dashboard/ai-insight`);
  }
}
