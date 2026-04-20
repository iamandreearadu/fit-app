import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ConversationSummary,
  DirectMessage,
  SendMessageRequest,
  CreateConversationRequest
} from '../core/models/chat.model';
import { PaginatedResponse } from '../core/models/social.model';

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/conversations`;

  getConversations(): Observable<ConversationSummary[]> {
    return this.http.get<ConversationSummary[]>(this.base);
  }

  createConversation(req: CreateConversationRequest): Observable<ConversationSummary> {
    return this.http.post<ConversationSummary>(this.base, req);
  }

  getMessages(id: number, beforeMessageId?: number, pageSize = 30): Observable<PaginatedResponse<DirectMessage>> {
    let params = new HttpParams().set('pageSize', pageSize);
    if (beforeMessageId !== undefined) {
      params = params.set('beforeMessageId', beforeMessageId);
    }
    return this.http.get<PaginatedResponse<DirectMessage>>(`${this.base}/${id}/messages`, { params });
  }

  sendMessage(id: number, req: SendMessageRequest): Observable<DirectMessage> {
    return this.http.post<DirectMessage>(`${this.base}/${id}/messages`, req);
  }

  markAsRead(id: number): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/read`, {});
  }

  deleteMessage(convId: number, msgId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${convId}/messages/${msgId}`);
  }
}
