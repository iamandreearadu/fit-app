import { Injectable, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { ConversationService } from '../../api/conversation.service';
import { ChatHubService } from '../services/chat-hub.service';
import { ConversationSummary, DirectMessage, CreateConversationRequest } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatFacade {
  private readonly convSvc = inject(ConversationService);
  private readonly chatHub = inject(ChatHubService);

  conversations = signal<ConversationSummary[]>([]);
  messages = signal<DirectMessage[]>([]);
  activeConversationId = signal<number | null>(null);
  isLoadingConversations = signal(false);
  isLoadingMessages = signal(false);
  isConnected = signal(false);
  conversationsError = signal<string | null>(null);
  messagesError = signal<string | null>(null);
  hasMoreMessages = signal(true);

  readonly unreadConversationsCount = computed(() =>
    this.conversations().filter(c => c.unreadCount > 0).length
  );

  constructor() {
    this.chatHub.message$.pipe(takeUntilDestroyed()).subscribe(msg => {
      if (msg.conversationId === this.activeConversationId()) {
        this.messages.update(msgs => [...msgs, msg]);
      }
      // Update last message in conversation list
      this.conversations.update(convs => convs.map(c =>
        c.id === msg.conversationId
          ? {
              ...c,
              lastMessage: { content: msg.content, hasImage: !!msg.imageUrl, sentAt: msg.sentAt },
              unreadCount: msg.conversationId === this.activeConversationId() ? 0 : c.unreadCount + 1,
              updatedAt: msg.sentAt
            }
          : c
      ));
    });
  }

  async connectHub(token: string): Promise<void> {
    try {
      await this.chatHub.connect(token);
      this.isConnected.set(true);
    } catch {
      this.isConnected.set(false);
    }
  }

  async loadConversations(): Promise<void> {
    this.isLoadingConversations.set(true);
    this.conversationsError.set(null);
    try {
      const convs = await firstValueFrom(this.convSvc.getConversations());
      this.conversations.set(convs);
    } catch {
      this.conversationsError.set('Failed to load conversations.');
    } finally {
      this.isLoadingConversations.set(false);
    }
  }

  async loadMessages(id: number, beforeMessageId?: number): Promise<void> {
    this.activeConversationId.set(id);
    this.isLoadingMessages.set(true);
    this.messagesError.set(null);
    if (!beforeMessageId) {
      this.messages.set([]);
      this.hasMoreMessages.set(true);
    }
    try {
      const res = await firstValueFrom(this.convSvc.getMessages(id, beforeMessageId));
      if (beforeMessageId) {
        this.messages.update(msgs => [...res.items, ...msgs]);
      } else {
        this.messages.set(res.items);
      }
      this.hasMoreMessages.set(res.hasMore);
    } catch {
      this.messagesError.set('Failed to load messages.');
    } finally {
      this.isLoadingMessages.set(false);
    }
  }

  async sendMessage(conversationId: number, content?: string, imageBase64?: string, mimeType?: string): Promise<void> {
    await this.chatHub.sendMessage(conversationId, content, imageBase64, mimeType);
  }

  async markAsRead(id: number): Promise<void> {
    try {
      await firstValueFrom(this.convSvc.markAsRead(id));
      this.conversations.update(convs =>
        convs.map(c => c.id === id ? { ...c, unreadCount: 0 } : c)
      );
    } catch {
      // silently ignore
    }
  }

  async createConversation(req: CreateConversationRequest): Promise<ConversationSummary> {
    const conv = await firstValueFrom(this.convSvc.createConversation(req));
    this.conversations.update(convs => [conv, ...convs]);
    return conv;
  }

  async deleteMessage(convId: number, msgId: number): Promise<void> {
    await firstValueFrom(this.convSvc.deleteMessage(convId, msgId));
    this.messages.update(msgs => msgs.map(m =>
      m.id === msgId ? { ...m, isDeleted: true, content: undefined, imageUrl: undefined } : m
    ));
  }

  async joinConversation(id: number): Promise<void> {
    await this.chatHub.joinConversation(id);
  }

  async leaveConversation(id: number): Promise<void> {
    await this.chatHub.leaveConversation(id);
  }
}
