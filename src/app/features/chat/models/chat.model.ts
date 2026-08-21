export type ChatAnswerKey = 'yes' | 'no';

export type ChatContextValue = boolean | null;

export interface ChatMessage {
    id: string;
    content: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    isTyping: boolean;
    displayContent: string;
    views?: ChatViewDto[];
    nextQuestion?: ChatNextQuestionDto;
    areViewsVisible?: boolean;
}

export interface ChatDto {
    id: string;
}

export interface ChatCategoryDto {
    id?: string;
    name?: string;
}

export interface ChatQuestionDto {
    q: string;
    category?: ChatCategoryDto;
}

export interface ChatAnswerSelectionDto {
    question_id: string;
    answer_key: ChatAnswerKey;
}

export interface ChatFreeTextRequest {
    chat: ChatDto;
    question: ChatQuestionDto;
}

export interface ChatTypedAnswerRequest {
    chat: ChatDto;
    answer: ChatAnswerSelectionDto;
}

export type ChatRequest = ChatFreeTextRequest | ChatTypedAnswerRequest;

export interface ChatNextAnswerDto {
    key: ChatAnswerKey;
    label: string;
}

export interface ChatNextQuestionDto {
    id: string;
    question: string;
    type: 'chips_yes_no';
    answers: ChatNextAnswerDto[];
}

export interface ChatViewDto {
    type: string;
    id: string;
    value: string;
    question: string;
    categoryId: string;
}

export interface ChatLegacyNextDto {
    questionText: string;
    type: string;
    view: ChatViewDto[];
}

export type ChatNextDto = ChatNextQuestionDto | ChatLegacyNextDto;

export interface ChatAnswerDto {
    content: string;
    next?: ChatNextDto[];
    category?: ChatCategoryDto;
}

export interface ChatRuntimeDto {
    chat: ChatDto;
    variant_id: string;
    context: Record<string, ChatContextValue>;
    context_contract_id: string;
    graph_sha256: string;
    revision: number;
}

export interface ChatResponse {
    answer?: ChatAnswerDto;
    runtime?: ChatRuntimeDto;
}

export interface ChatLaunchParams {
    category_id?: string;
    stage_id?: string;
    variant_id?: string;
    context?: Record<string, ChatContextValue>;
    context_contract_id?: string;
}

export interface ChatStartRequest {
    launch?: ChatLaunchParams;
}

export interface StartResponse extends ChatResponse {
    chat: ChatDto;
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
