import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SocialNotification, UnreadCountResponse } from '../core/models/notification.model';
import { PaginatedResponse } from '../core/models/social.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/notifications`;

  getNotifications(page = 1, pageSize = 20): Observable<PaginatedResponse<SocialNotification>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PaginatedResponse<SocialNotification>>(this.base, { params });
  }

  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.base}/unread-count`);
  }

  markAllRead(): Observable<void> {
    return this.http.put<void>(`${this.base}/read-all`, {});
  }

  markOneRead(id: number): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/read`, {});
  }
}
