import { Injectable, inject } from '@angular/core';
import { GroqAiApiService } from '../../api/groq-ai-api.service';
import { GroqAiService as GroqInMemoryService } from '../../api/groq-ai.service';
import { GrogAiService as GrogCoreService } from '../services/grog-ai.service';
import { ChatMessage } from '../models/groq-ai.model';
import { MealMacros } from '../models/meal-macros';
import { UserProfile } from '../models/user.model';
import { WorkoutTemplate } from '../models/workouts-tab.model';


@Injectable({ providedIn: 'root' })
export class GroqAiFacade {

  private state = inject(GrogCoreService);
  private groqInMemoryService = inject(GroqInMemoryService);
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
    const id = await this.groqInMemoryService.createConversation();
    this.state.setConversationId(id);
    this.state.clearMessages();
    // Prepend new (empty) conversation to list
    this.state.setConversations([
      { id, createdAt: Date.now(), messages: [], userId: '', preview: '' },
      ...this.state.conversations(),
    ]);
  }

  async loadConversations() {
    const conversations = await this.groqInMemoryService.loadUserConversations();
    this.state.setConversations(conversations);
  }

  async openConversation(id: string) {
    this.state.setConversationId(id);
    this.state.clearMessages();
    const msgs = await this.groqInMemoryService.loadMessages(id);
    this.state.setMessages(msgs);
  }

  // ========================================================
  // SAVE MESSAGE (LOCAL + IN-MEMORY)
  // ========================================================

  private async saveMessage(role: 'user' | 'assistant', content: string, imageUrl?: string): Promise<void> {
    let conversationId = this.state.getConversationId;

    if (!conversationId) {
      conversationId = await this.groqInMemoryService.createConversation();
      this.state.setConversationId(conversationId);
      this.state.setConversations([
        { id: conversationId, createdAt: Date.now(), messages: [], userId: '', preview: '' },
        ...this.state.conversations(),
      ]);
    }

    const message: ChatMessage = { role, content, imageUrl, timestamp: Date.now() };
    this.state.appendMessage(message);
    await this.groqInMemoryService.saveMessage(conversationId, message);

    // Update preview in list with first user message
    if (role === 'user') {
      const userMsgCount = this.state.messages().filter(m => m.role === 'user').length;
      if (userMsgCount === 1) {
        const preview = content.length > 60 ? content.slice(0, 60) + '…' : content;
        this.state.setConversations(
          this.state.conversations().map(c =>
            c.id === conversationId ? { ...c, preview } : c
          )
        );
      }
    }
  }

  // ========================================================
  // FUNCTION: ASK AI (TEXT + IMAGE)
  // ========================================================

  async askAI(prompt: string, file?: File, imagePreview?: string): Promise<void> {
    this.state.setLoading(true);

    try {
      await this.saveMessage('user', prompt, imagePreview);

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

  // ========================================================
  //  FUNCTION: EXTRACT MEAL MACROS FROM IMAGE
  // ========================================================

  async analyzeMeal(file: File): Promise<MealMacros> {
    this.state.setLoading(true);
    try {
      return await this.groqService.analyzeMealImage(file);
    } finally {
      this.state.setLoading(false);
    }
  }

  // ========================================================
  //  FUNCTION: ESTIMATE WORKOUT CALORIES
  // ========================================================

  async calculateWorkoutCalories(user: UserProfile, workout: WorkoutTemplate): Promise<string> {
    return this.groqService.calculateWorkoutCalories(user, workout);
  }

  async deleteConversation(id: string): Promise<void> {
    if (!id) return;
    this.state.setLoading(true);
    try {
      await this.groqInMemoryService.deleteConversation(id);

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
