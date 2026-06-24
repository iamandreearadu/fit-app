import { Injectable, inject } from '@angular/core';
import { AiInferenceService } from '../../api/ai-inference.service';
import { AiChatHistoryService } from '../../api/ai-chat-history.service';
import { OpenFoodFactsService } from '../../api/open-food-facts.service';
import { AiChatStore } from '../store/ai-chat.store';
import { ChatMessage, ModuleContext } from '../models/groq-ai.model';
import { BarcodeProduct } from '../models/barcode-product.model';
import { MealMacros } from '../models/meal-macros';
import { UserProfile } from '../models/user.model';
import { WorkoutTemplate } from '../models/workouts-tab.model';

@Injectable({ providedIn: 'root' })
export class GroqAiFacade {
  private state = inject(AiChatStore);
  private chatHistoryService = inject(AiChatHistoryService);
  private inferenceService = inject(AiInferenceService);
  private offService = inject(OpenFoodFactsService);

  messages = this.state.messages;
  conversations = this.state.conversations;
  conversationId = this.state.conversationId;
  loading = this.state.loading;

  constructor() {}

  // ========================================================
  // CREATE / LOAD CONVERSATIONS
  // ========================================================

  async startConversation() {
    const id = await this.chatHistoryService.createConversation();
    this.state.setConversationId(id);
    this.state.clearMessages();
    // Prepend new (empty) conversation to list
    this.state.setConversations([
      { id, createdAt: Date.now(), messages: [], userId: '', preview: '' },
      ...this.state.conversations(),
    ]);
  }

  async loadConversations() {
    const conversations =
      await this.chatHistoryService.loadUserConversations();
    this.state.setConversations(conversations);
  }

  async openConversation(id: string) {
    this.state.setConversationId(id);
    this.state.clearMessages();
    const msgs = await this.chatHistoryService.loadMessages(id);
    this.state.setMessages(msgs);
  }

  // ========================================================
  // SAVE MESSAGE (LOCAL + PERSISTED)
  // ========================================================

  private async saveMessage(
    role: 'user' | 'assistant',
    content: string,
    imageUrl?: string,
  ): Promise<void> {
    let conversationId = this.state.getConversationId;

    if (!conversationId) {
      conversationId = await this.chatHistoryService.createConversation();
      this.state.setConversationId(conversationId);
      this.state.setConversations([
        {
          id: conversationId,
          createdAt: Date.now(),
          messages: [],
          userId: '',
          preview: '',
        },
        ...this.state.conversations(),
      ]);
    }

    const message: ChatMessage = {
      role,
      content,
      imageUrl,
      timestamp: Date.now(),
    };
    this.state.appendMessage(message);
    await this.chatHistoryService.saveMessage(conversationId, message);

    // Update preview in list with first user message
    if (role === 'user') {
      const userMsgCount = this.state
        .messages()
        .filter((m) => m.role === 'user').length;
      if (userMsgCount === 1) {
        const preview =
          content.length > 60 ? content.slice(0, 60) + '…' : content;
        this.state.setConversations(
          this.state
            .conversations()
            .map((c) => (c.id === conversationId ? { ...c, preview } : c)),
        );
      }
    }
  }

  // ========================================================
  // FUNCTION: ASK AI (TEXT + IMAGE)
  // ========================================================

  async askAI(
    prompt: string,
    file?: File,
    imagePreview?: string,
    moduleContext?: ModuleContext,
  ): Promise<void> {
    this.state.setLoading(true);

    try {
      await this.saveMessage('user', prompt, imagePreview);

      let aiResponse = '';

      if (file) {
        // Image analysis — moduleContext does not apply
        aiResponse = await this.inferenceService.analyzeImage(prompt, file);
      } else {
        aiResponse = await this.inferenceService.askText(prompt, moduleContext);
      }

      await this.saveMessage('assistant', aiResponse);
    } catch (err) {
      console.error('AI error:', err);
      await this.saveMessage(
        'assistant',
        'An error occurred while processing your request.',
      );
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
      return await this.inferenceService.analyzeMealImage(file);
    } finally {
      this.state.setLoading(false);
    }
  }

  // ========================================================
  //  FUNCTION: ESTIMATE WORKOUT CALORIES
  // ========================================================

  async calculateWorkoutCalories(
    user: UserProfile,
    workout: WorkoutTemplate,
  ): Promise<{ calories: number; explanation: string }> {
    return this.inferenceService.calculateWorkoutCalories(user, workout);
  }

  // ========================================================
  //  FUNCTION: BARCODE PRODUCT LOOKUP
  // ========================================================

  async lookupBarcode(barcode: string): Promise<BarcodeProduct> {
    return this.offService.getByBarcode(barcode);
  }

  async deleteConversation(id: string): Promise<void> {
    if (!id) return;
    this.state.setLoading(true);
    try {
      await this.chatHistoryService.deleteConversation(id);

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
