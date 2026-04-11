export interface ChatMessage {
    id: string;
    content: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    isTyping: boolean;
    displayContent: string;
    views?: ChatViewDto[];
    areViewsVisible?: boolean;
}

export interface ChatDto {
    id: string;
}

export interface ChatQuestionDto {
    q: string;
    variant?: ChatQuestionVariantDto;
}

export interface ChatQuestionVariantDto {
    id: string;
}

export interface ChatViewDto {
    type: string;
    id: string;
    value: string;
    question: string;
}

export interface ChatNextDto {
    questionText: string;
    view: ChatViewDto[];
}

export interface ChatRequest {
    chat: ChatDto;
    question: ChatQuestionDto;
}

export interface ChatResponse {
    answer?: {
        content: string;
        next?: ChatNextDto[];
    };
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
