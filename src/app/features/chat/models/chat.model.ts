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
    variantId: string;
    categoryId: string;
}

export interface ChatNextDto {
    questionText: string
    type: string
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
        category?: ChatCategoryDto;
    };
}

export interface ChatCategoryDto {
    id?: string;
    name?: string;
}

export  interface StartResponse {
    chat: {
        id: string;
    };
}

export interface MessageListItem {
    id: string;
    text: string;
    direction: number;
    category?: ChatCategoryDto;
}

export interface MessageListResponse {
    message: MessageListItem[];
}

export interface ChatListItem {
    id: string;
    name: string;
}

export interface ChatListResponse {
    chats: ChatListItem[];
}
