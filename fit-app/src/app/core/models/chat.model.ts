import { UserSummary } from './social.model';

export interface MessagePreview {
  content?: string;
  hasImage: boolean;
  sentAt: string;
}

export interface ConversationSummary {
  id: number;
  otherParticipant: UserSummary;
  lastMessage?: MessagePreview;
  unreadCount: number;
  updatedAt: string;
}

export interface DirectMessage {
  id: number;
  conversationId: number;
  sender: UserSummary;
  content?: string;
  imageUrl?: string;
  sentAt: string;
  isDeleted: boolean;
  isOwn: boolean;
}

export interface SendMessageRequest {
  content?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface CreateConversationRequest {
  targetUserId: string;
}
