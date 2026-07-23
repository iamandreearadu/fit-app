import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ConversationService } from '../../api/conversation.service';
import { ChatHubService } from '../services/chat-hub.service';
import { ConversationSummary, DirectMessage } from '../models/chat.model';
import { ChatFacade } from './chat.facade';

describe('ChatFacade', () => {
  let facade: ChatFacade;
  let service: jasmine.SpyObj<ConversationService>;
  let hub: jasmine.SpyObj<ChatHubService>;
  const message$ = new Subject<DirectMessage>();
  const newConvMessage$ = new Subject<DirectMessage>();
  const messageDeleted$ = new Subject<{ messageId: number; conversationId: number }>();
  const reconnected$ = new Subject<void>();

  const conversation: ConversationSummary = {
    id: 7,
    otherParticipant: { id: '2', displayName: 'Alex' },
    unreadCount: 1,
    updatedAt: '2026-07-21T10:00:00Z',
  };
  const message: DirectMessage = {
    id: 11,
    conversationId: 7,
    sender: { id: '2', displayName: 'Alex' },
    content: 'Hello',
    sentAt: '2026-07-21T10:01:00Z',
    isDeleted: false,
    isOwn: false,
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<ConversationService>('ConversationService', [
      'getConversations', 'getMessages', 'sendMessage', 'markAsRead', 'createConversation', 'deleteMessage',
    ]);
    hub = jasmine.createSpyObj<ChatHubService>('ChatHubService', [
      'connect', 'sendMessage', 'joinConversation', 'leaveConversation',
    ], { message$, newConvMessage$, messageDeleted$, reconnected$ });
    TestBed.configureTestingModule({
      providers: [
        ChatFacade,
        { provide: ConversationService, useValue: service },
        { provide: ChatHubService, useValue: hub },
      ],
    });
    facade = TestBed.inject(ChatFacade);
  });

  it('loads conversations and computes the unread badge', async () => {
    service.getConversations.and.returnValue(of([conversation]));
    await facade.loadConversations();
    expect(facade.unreadConversationsCount()).toBe(1);
  });

  it('exposes conversation loading errors', async () => {
    service.getConversations.and.returnValue(throwError(() => new Error('network')));
    await facade.loadConversations();
    expect(facade.conversationsError()).toBe('Failed to load conversations.');
  });

  it('appends a real-time message only to the active conversation', () => {
    facade.activeConversationId.set(7);
    facade.conversations.set([conversation]);
    message$.next(message);
    expect(facade.messages()).toEqual([message]);
    expect(facade.conversations()[0].unreadCount).toBe(0);
  });

  it('marks a deleted real-time message without removing its timeline position', () => {
    facade.activeConversationId.set(7);
    facade.messages.set([message]);
    messageDeleted$.next({ messageId: 11, conversationId: 7 });
    expect(facade.messages()[0].isDeleted).toBeTrue();
    expect(facade.messages()[0].content).toBeUndefined();
  });

  it('sends image messages over HTTP instead of the SignalR payload channel', async () => {
    const imageMessage: DirectMessage = {
      ...message,
      id: 12,
      content: undefined,
      imageUrl: 'http://localhost:5140/uploads/chat/photo.jpg',
      isOwn: true,
    };
    facade.activeConversationId.set(7);
    service.sendMessage.and.returnValue(of(imageMessage));

    await facade.sendMessage(7, undefined, 'base64-image', 'image/jpeg');

    expect(service.sendMessage).toHaveBeenCalledWith(7, {
      content: undefined,
      imageBase64: 'base64-image',
      imageMimeType: 'image/jpeg',
    });
    expect(hub.sendMessage).not.toHaveBeenCalled();
    expect(facade.messages()).toEqual([imageMessage]);
  });
});
