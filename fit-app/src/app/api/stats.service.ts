import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserPublicStats } from '../core/models/stats.model';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/users`;

  getPublicStats(userId: string): Observable<UserPublicStats> {
    return this.http.get<UserPublicStats>(`${this.base}/${userId}/stats`);
  }
}
