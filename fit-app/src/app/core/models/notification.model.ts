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

// Fix 5 — SignalR streak-updated event payload.
// MUST NOT include health metrics (no BMI, weight, BMR, TDEE, goal calories).
export interface StreakUpdatedPayload {
  currentStreak: number;
  isNewRecord: boolean;
}
