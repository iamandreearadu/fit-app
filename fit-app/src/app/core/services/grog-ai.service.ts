import { Injectable, signal } from "@angular/core";
import { ChatConversation, ChatMessage } from '../models/groq-ai.model';

@Injectable({
  providedIn: 'root'
})
export class GrogAiService {

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


  setConversationId(id: string | null) {
    this._conversationId.set(id);
  }

  setMessages(list: ChatMessage[]) {
    this._messages.set(list ?? []);
  }

  appendMessage(msg: ChatMessage) {
    this._messages.update(list => [...list, msg]);
  }

  updateMessages(fn: (list: ChatMessage[]) => ChatMessage[]) {
    this._messages.update(fn);
  }

  setConversations(list: ChatConversation[]) {
    this._conversations.set(list ?? []);
  }

  setLoading(v: boolean) {
    this._loading.set(v);
  }

  clearMessages() {
    this._messages.set([]);
  }


}
