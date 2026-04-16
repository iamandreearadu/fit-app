import { UserSummary } from './social.model';

export type NotificationType = 'like' | 'comment' | 'follow' | 'message';

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
