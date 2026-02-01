export interface ChatRequest {
  q: string;
}

export interface ChatResponse {
  answer: {
    content: string;
  };
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}
