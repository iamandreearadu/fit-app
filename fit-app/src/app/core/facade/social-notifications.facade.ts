// Re-exports NotificationFacade as the canonical source of truth.
// The SocialShellComponent uses this class by name; we delegate to NotificationFacade.
export { NotificationFacade as SocialNotificationsFacade } from './notification.facade';
