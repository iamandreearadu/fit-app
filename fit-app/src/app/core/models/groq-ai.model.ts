export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: number;
}

export interface ChatConversation {
  id: string;
  createdAt: number;
  messages: ChatMessage[];
  userId: string;
  preview?: string;
}