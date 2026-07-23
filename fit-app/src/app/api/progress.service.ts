import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { NutritionistWeeklyReportDto, ProgressSummaryDto, ProgressWindow } from '../core/models/progress.model';
import { DailyUserData } from '../core/models/daily-user-data.model';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/progress`;

  getSummary(window: ProgressWindow): Observable<ProgressSummaryDto> {
    return this.http.get<ProgressSummaryDto>(`${this.apiUrl}/summary`, {
      params: new HttpParams().set('window', window),
    });
  }

  refreshReport(): Observable<NutritionistWeeklyReportDto> {
    return this.http.post<NutritionistWeeklyReportDto>(`${this.apiUrl}/report/refresh`, {});
  }

  logCheckIn(payload: { date: string; manualWeight: number; energyLevel?: number }): Observable<DailyUserData> {
    return this.http.patch<DailyUserData>(`${environment.apiUrl}/api/daily/check-in`, payload);
  }
}
