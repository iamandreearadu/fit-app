import { UserSummary } from './social.model';

export type NotificationType = 'Like' | 'Comment' | 'Follow' | 'NewMessage';

export interface SocialNotification {
  id: number;
  actor: UserSummary;
  type: NotificationType;
  message: string;
  referenceId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}
