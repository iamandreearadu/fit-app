// Re-exports ChatFacade as the canonical source of truth.
// The SocialShellComponent uses this class by name; we delegate to ChatFacade.
export { ChatFacade as SocialChatFacade } from './chat.facade';
