export interface ChatMessage {
    id: string;
    content: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    isTyping: boolean;
    displayContent: string;
}

export interface ChatDto {
    id: string;
}

export interface ChatQuestionDto {
    q: string;
}

export interface ChatRequest {
    chat: ChatDto;
    question: ChatQuestionDto;
}

export interface ChatResponse {
    answer: {
        content: string;
    };
}

export interface ApiResponse<T> {
    data: T;
    success: boolean;
    error?: string;
}

export interface Message {
    id?: string;
    text: string;
    direction: 'user' | 'assistant';
}

export  interface StartResponse {
    chat: {
        id: string;
    };
}

export interface MessageListResponse {
    message: Array<{
        id: string;
        text: string;
        direction: number;
    }>;
}
