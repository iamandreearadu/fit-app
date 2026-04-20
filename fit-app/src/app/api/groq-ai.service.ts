import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ChatConversation, ChatMessage } from '../core/models/groq-ai.model';

interface ConversationDto {
  id: string;
  createdAt: number;
  userId: string;
  preview: string;
  messages: ChatMessageDto[];
}

interface ChatMessageDto {
  id?: string;
  role: string;
  content: string;
  imageUrl?: string;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class GroqAiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/chat`;

  async createConversation(): Promise<string> {
    const conv = await firstValueFrom(
      this.http.post<ConversationDto>(this.baseUrl, {})
    );
    return conv.id;
  }

  async saveMessage(conversationId: string, msg: ChatMessage): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.baseUrl}/${conversationId}/messages`, {
        role: msg.role,
        content: msg.content,
        imageUrl: msg.imageUrl ?? null,
        timestamp: msg.timestamp,
      })
    );
  }

  async loadUserConversations(): Promise<ChatConversation[]> {
    const dtos = await firstValueFrom(
      this.http.get<ConversationDto[]>(this.baseUrl)
    );
    return dtos.map(d => ({
      id: d.id,
      createdAt: d.createdAt,
      messages: [],
      userId: d.userId,
      preview: d.preview,
    }));
  }

  async loadMessages(conversationId: string): Promise<ChatMessage[]> {
    const dtos = await firstValueFrom(
      this.http.get<ChatMessageDto[]>(`${this.baseUrl}/${conversationId}/messages`)
    );
    return dtos.map(d => ({
      id: d.id,
      role: d.role as 'user' | 'assistant',
      content: d.content,
      imageUrl: d.imageUrl,
      timestamp: d.timestamp,
    }));
  }

  async uploadChatImage(file: File, _conversationId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  async deleteConversation(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.baseUrl}/${id}`)
    );
  }
}