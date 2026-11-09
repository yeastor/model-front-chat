export interface ChatMessage {
    isQuestion?: boolean;
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
    guided?: GuidedState;
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

export interface ConversationEnvelope { sessionId: string; revision: number; }
export interface ChatResponse {
    conversation?: ConversationEnvelope;
    presentation?: { kind: 'full' | 'continuation' | 'clarification' | 'notice'; responseId: string; answerFingerprint?: string; referencesResponseId?: string };
    turn?: { turnId: string; revision: number; replayed: boolean; messageId: string };
    guided?: GuidedState;
    status?: string;
    answer?: {
        content: string;
        next?: ChatNextDto[];
        category?: ChatCategoryDto;
    };
}

export interface GuidedState {
    conversation?: ConversationEnvelope;
    native?: {sessionId: string; nonce: string; kind?: string; blockId?: string; fieldKey?: string; value?: boolean | null; questionId?: string; revision?: number; episodeId?: string; roundId?: string; offerId?: string; draft?: string; consentVersion?: string; consentText?: string; text?: string; consent?: boolean};
    version?: string;
    entryVariantId?: string;
    categoryId?: string;
    stageId?: string;
    context: Record<string, boolean | null>;
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
