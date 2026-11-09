import type {ChatMessage, GuidedState} from '../models/chat.model';

export interface GuidedLaunch {
    guided?: GuidedState;
    variantId?: string;
}

export function guidedLaunch(
    params: URLSearchParams,
    chatId: string,
    historyLength: number,
    stored?: GuidedState,
): GuidedLaunch | undefined {
    if (stored) return {guided: stored};
    if (historyLength > 0) return {};
    if (params.get('topic_entry') === '1') return {};

    const matchingChat = params.get('chat_id') === chatId;
    const variantId = matchingChat && params.get('guided_entry') === 'article'
        && params.get('article_slug')?.trim() ? params.get('variant_id')?.trim() : undefined;
    // The server resolves the source variant. Article metadata is not user evidence.
    if (variantId) return {variantId};

    const categoryId = matchingChat ? params.get('category_id') : null;
    const stageId = matchingChat ? params.get('stage_id') : null;
    return categoryId && stageId ? {guided: {categoryId, stageId, context: {}}} : undefined;
}

export function savedGuidedText(text: string): string {
    return text.replace(/\r?\n\[Уточнение; выберите ответ в чате\]$/, '');
}

export function resumedGuidedMessages(history: ChatMessage[], response: ChatMessage[]): ChatMessage[] {
    const last = history.at(-1);
    const first = response[0];
    // The API persists the answer text; only its live controls need restoring.
    if (last?.sender === 'ai' && first && (last.id === first.id || last.content === first.content)) {
        last.content = first.content; last.displayContent = first.content;
        last.views = first.views; last.areViewsVisible = true; last.isQuestion = first.isQuestion;
        return response.slice(1);
    }
    return response;
}
