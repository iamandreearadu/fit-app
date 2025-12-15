import { Injectable, inject } from '@angular/core';
import { GroqAiApiService } from '../../api/groq-ai-api.service';
import { GroqAiService as GroqApiFirebaseService } from '../../api/groq-ai.service';
import { GrogAiService as GrogCoreService } from '../services/grog-ai.service';
import { ChatMessage } from '../models/groq-ai.model';


@Injectable({ providedIn: 'root' })
export class GroqAiFacade {

  private state = inject(GrogCoreService);
  private groqFirebaseService = inject(GroqApiFirebaseService);
  private groqService = inject(GroqAiApiService);

  messages = this.state.messages;
  conversations = this.state.conversations;
  conversationId = this.state.conversationId;
  loading = this.state.loading;

  constructor() {}

  // ========================================================
  // CREATE / LOAD CONVERSATIONS
  // ========================================================

  async startConversation() {
    const id = await this.groqFirebaseService.createConversation();
    this.state.setConversationId(id);
    this.state.clearMessages();
  }

  async loadConversations() {
    const conversation = await this.groqFirebaseService.loadUserConversations();
    this.state.setConversations(conversation);
  }

  async openConversation(id: string) {
    this.state.setConversationId(id);
    const msgs = await this.groqFirebaseService.loadMessages(id);
    this.state.setMessages(msgs);
  }

  // ========================================================
  // SAVE MESSAGE (LOCAL + FIREBASE)
  // ========================================================

  private async saveMessage(role: 'user' | 'assistant', content: string, imageUrl?: string): Promise<void> {
    let conversationId = this.state.getConversationId;

    if (!conversationId) {
      conversationId = await this.groqFirebaseService.createConversation();
      this.state.setConversationId(conversationId);
    }

    const message: ChatMessage = {
      role,
      content,
      imageUrl,
      timestamp: Date.now(),
    };

    this.state.appendMessage(message);

    await this.groqFirebaseService.saveMessage(conversationId, message);
  }

  // ========================================================
  // MASTER FUNCTION: ASK AI (TEXT + IMAGE)
  // ========================================================

  async askAI(prompt: string, file?: File, imagePreview?: string): Promise<void> {
    this.state.setLoading(true);

    try {
      await this.saveMessage(
        'user', 
        prompt,
        imagePreview);

      let aiResponse = '';

      if (file) {
        aiResponse = await this.groqService.analyzeImage(prompt, file);
      } else {
        aiResponse = await this.groqService.askText(prompt);
      }

      await this.saveMessage('assistant', aiResponse);

    } catch (err) {
      console.error('AI error:', err);
      await this.saveMessage('assistant', 'An error occurred while processing your request.');
    } finally {
      this.state.setLoading(false);
    }
  }

  async deleteConversation(id: string): Promise<void> {
    if (!id) return;
    this.state.setLoading(true);
    try {
      await this.groqFirebaseService.deleteConversation(id);

      await this.loadConversations();

      if (this.state.getConversationId === id) {
        this.state.setConversationId(null);
        this.state.clearMessages();
      }

    } finally {
      this.state.setLoading(false);
    }
  }
}
