export interface ChatMessage {
    id: string;
    content: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    isTyping: boolean;
    displayContent: string;
}

export interface ChatRequest {
    q: string;
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
