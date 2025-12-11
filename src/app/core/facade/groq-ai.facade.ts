import { Injectable, inject, signal } from '@angular/core';
import { GroqService } from '../services/groq-ai.service';
import { GroqAiService } from '../../api/groq-ai-firebase.service';
import { ChatConversation, ChatMessage } from '../models/groq-ai.model';

@Injectable({ providedIn: 'root' })
export class GroqAiFacade {

  private groqFirebaseService = inject(GroqAiService);
  private groqService = inject(GroqService);

  private _conversationId = signal<string | null>(null);
  private _messages = signal<ChatMessage[]>([]);
  private _conversations = signal<ChatConversation[]>([]);
  private _loading = signal(false);

  messages = this._messages.asReadonly();
  conversations = this._conversations.asReadonly();
  conversationId = this._conversationId.asReadonly();
  loading = this._loading.asReadonly();

  constructor() {}

  // ========================================================
  // CREATE / LOAD CONVERSATIONS
  // ========================================================

  async startConversation() {
    const id = await this.groqFirebaseService.createConversation();
    this._conversationId.set(id);
    this._messages.set([]);
  }

  async loadConversations() {
    const conv = await this.groqFirebaseService.loadUserConversations();
    this._conversations.set(conv);
  }

  async openConversation(id: string) {
    this._conversationId.set(id);
    const msgs = await this.groqFirebaseService.loadMessages(id);
    this._messages.set(msgs);
  }

  // ========================================================
  // SAVE MESSAGE (LOCAL + FIREBASE)
  // ========================================================

  private async saveMessage(role: 'user' | 'assistant', content: string) {
    let convId = this._conversationId();

    // if no conversation exists → create one
    if (!convId) {
      convId = await this.groqFirebaseService.createConversation();
      this._conversationId.set(convId);
    }

    const message: ChatMessage = {
      role,
      content,
      timestamp: Date.now(),
    };

    // update locally
    this._messages.update(list => [...list, message]);

    // save to Firebase
    await this.groqFirebaseService.saveMessage(convId, message);
  }

  // ========================================================
  // MASTER FUNCTION: ASK AI (TEXT + IMAGE)
  // ========================================================

  async askAI(prompt: string, file?: File): Promise<void> {
    this._loading.set(true);

    try {
      // 1️⃣ save user message
      await this.saveMessage('user', prompt);

      // 2️⃣ call Groq API
      let aiResponse = '';

      if (file) {
        aiResponse = await this.groqService.analyzeImage(prompt, file);
      } else {
        aiResponse = await this.groqService.askText(prompt);
      }

      // 3️⃣ save assistant message
      await this.saveMessage('assistant', aiResponse);

    } catch (err) {
      console.error('AI error:', err);
      await this.saveMessage('assistant', 'An error occurred while processing your request.');
    } finally {
      this._loading.set(false);
    }
  }


  async deleteConversation(id: string): Promise<void> {
  if (!id) return;

  this._loading.set(true);
  try {
    await this.groqFirebaseService.deleteConversation(id);

    // reload list
    await this.loadConversations();

    // if the deleted conversation is open → close it
    if (this._conversationId() === id) {
      this._conversationId.set(null);
      this._messages.set([]);
    }

  } finally {
    this._loading.set(false);
  }
}
}
