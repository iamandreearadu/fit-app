import { Injectable, signal } from '@angular/core';
import { ChatConversation, ChatMessage } from '../models/groq-ai.model';

/** Signal-based in-memory state store for the AI assistant chat. */
@Injectable({
  providedIn: 'root'
})
export class AiChatStore {

  private _conversationId = signal<string | null>(null);
  private _messages = signal<ChatMessage[]>([]);
  private _conversations = signal<ChatConversation[]>([]);
  private _loading = signal(false);

  conversationId = this._conversationId.asReadonly();
  messages = this._messages.asReadonly();
  conversations = this._conversations.asReadonly();
  loading = this._loading.asReadonly();

  get getConversationId(): string | null {
    return this._conversationId();
  }

  setConversationId(id: string | null): void {
    this._conversationId.set(id);
  }

  setMessages(list: ChatMessage[]): void {
    this._messages.set(list ?? []);
  }

  appendMessage(msg: ChatMessage): void {
    this._messages.update(list => [...list, msg]);
  }

  updateMessages(fn: (list: ChatMessage[]) => ChatMessage[]): void {
    this._messages.update(fn);
  }

  setConversations(list: ChatConversation[]): void {
    this._conversations.set(list ?? []);
  }

  setLoading(v: boolean): void {
    this._loading.set(v);
  }

  clearMessages(): void {
    this._messages.set([]);
  }
}
