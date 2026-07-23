import { UserSummary } from './social.model';

export interface MessagePreview {
  content?: string;
  hasImage: boolean;
  sentAt: string;
  messageType?: 'text' | 'shared_post';
}

export interface SharedPostPreview {
  postId: number;
  isAvailable: boolean;
  author?: UserSummary;
  content?: string;
  imageUrl?: string;
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
  messageType?: 'text' | 'shared_post';
  sharedPostId?: number;
  sharedPost?: SharedPostPreview;
}

export interface SendMessageRequest {
  content?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface CreateConversationRequest {
  targetUserId: string;
}
