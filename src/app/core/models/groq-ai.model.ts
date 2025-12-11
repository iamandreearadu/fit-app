export interface GroqChatChoice {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
  };
}

export interface GroqChatResponse {
  choices?: GroqChatChoice[];
}


export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatConversation {
  id: string;
  createdAt: number;
  messages: ChatMessage[];
  userId: string; 
}