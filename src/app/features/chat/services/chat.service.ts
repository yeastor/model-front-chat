import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom, Observable, map, retry} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ChatListResponse, ChatResponse, GuidedState, MessageListResponse, StartResponse} from '../models/chat.model';
import { ChatExport } from './chat-pdf.service';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private decorate(response: ChatResponse): ChatResponse {
        if (response.guided) response.guided.conversation = response.conversation;
        return response;
    }
    public sendGuided(chatId: string, question: string, guided?: GuidedState, resume = false, categoryId?: string, variantId?: string, turnId: string = crypto.randomUUID()): Observable<ChatResponse> {
        return this.http.post<ChatResponse>(`${this.apiUrl}/guided`, { protocolVersion: 2, id: chatId, question, guided, resume, categoryId, variantId, turnId: resume ? undefined : turnId, conversation: guided?.conversation || (guided?.native?.revision !== undefined ? {sessionId: guided.native.sessionId, revision: guided.native.revision} : undefined) }).pipe(retry({count: 1, delay: 200}), map(r => this.decorate(r)));
    }
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {
    }

    public sendMessage(chatId: string, message: string, variantId?: string, categoryId?: string, stageId?: string, state?: GuidedState, turnId: string = crypto.randomUUID()): Observable<ChatResponse> {
        return this.http.post<ChatResponse>(`${this.apiUrl}/conversation`, { protocolVersion: 2, id: chatId, question: message, variantId, categoryId, conversation: state?.conversation, turnId, launchHint: stageId ? { stageId, categoryId } : undefined }).pipe(retry({count: 1, delay: 200}), map(r => this.decorate(r)));
    }

    public getTopicContext(categoryId: string, stageId: string): Observable<{ chat: { placeholder: string }; entry: { subcategory: { chips: { label: string; variant_id: string }[] } | null } }> {
        const params = new URLSearchParams({ category_id: categoryId, stage_id: stageId });
        return this.http.get<{ chat: { placeholder: string }; entry: { subcategory: { chips: { label: string; variant_id: string }[] } | null } }>('/api/chat-context/launch?' + params);
    }

    public getList(): Observable<ChatListResponse> {
        return this.http.get<ChatListResponse>(`${this.apiUrl}/list`);
    }

    public exportChat(id: string): Promise<ChatExport> {
        return firstValueFrom(this.http.post<ChatExport>(`${this.apiUrl}/export`, { id }));
    }

    public async startChat(): Promise<string> {
        const response = await firstValueFrom(
            this.http.post<StartResponse>(`${this.apiUrl}/start/start`, {})
        );

        return response.chat.id;
    }

    public async loadMessages(chatId: string): Promise<MessageListResponse> {
        const response = await firstValueFrom(
            this.http.post<MessageListResponse>(
                `${this.apiUrl}/massage/list`,
                {id: chatId}
            )
        );

        response.message = response.message.map(item => ({...item, direction: Number(item.direction)}));
        return response;
    }

    formatContent(content: string): string {
        const linkPlaceholders: string[] = [];
        const structured = /<(?:section|article|h[1-6]|p|ol|ul|li|details)\b/i.test(content);
        const blockPlaceholders: string[] = [];
        let blockPrefix = '___CHAT_BLOCK_';
        while (content.includes(blockPrefix)) blockPrefix += 'X';

        let processed = content.replace(/<a\b[^>]*>(.*?)<\/a>/gis, (match, innerText) => {
            const openTagMatch = match.match(/<a\b([^>]*)>/is);
            if (!openTagMatch) return match;

            const attrsStr = openTagMatch[1];

            const hrefMatch = attrsStr.match(/href\s*=\s*"([^"]*)"/i)
                || attrsStr.match(/href\s*=\s*'([^']*)'/i);
            const href = hrefMatch ? hrefMatch[1] : '';

            const titleMatch = attrsStr.match(/title\s*=\s*"([^"]*)"/i)
                || attrsStr.match(/title\s*=\s*'([^']*)'/i);
            const title = titleMatch ? titleMatch[1] : '';

            const escapedInner = this.escapeHtml(innerText);

            let sanitized = '<a';
            if (/^(?:\/(?!\/)|https?:\/\/|mailto:|tel:|#)/i.test(href)) {
                sanitized += ` href="${this.escapeHtml(href)}"`;
                if (href.startsWith('/documents/') || href.startsWith('/laws/')) sanitized += ' target="_top"';
            }
            if (title) {
                sanitized += ` title="${this.escapeHtml(title)}"`;
            }
            sanitized += `>${escapedInner}</a>`;

            const index = linkPlaceholders.length;
            linkPlaceholders.push(sanitized);
            return `___LINK_PH_${index}___`;
        });

        // Preserve only inert answer structure. Attributes and unknown tags stay escaped.
        // Mandatory details remain expanded; no source prose or stored history is changed.
        if (structured) {
            processed = processed.replace(/<(\/?)(section|article|h[1-6]|p|ol|ul|li|strong|em|b|i|blockquote|br|details|summary)\b[^>]*>/gi,
                (_match, closing: string, name: string) => {
                    const tag = name.toLowerCase();
                    const visibleTag = (tag === 'details' || tag === 'article') ? 'section' : tag === 'summary' ? 'h3' : tag;
                    const index = blockPlaceholders.push(`<${closing}${visibleTag}>`) - 1;
                    return `${blockPrefix}${index}___`;
                });
        }
        processed = this.escapeHtml(processed);
        if (structured) {
            processed = processed.replace(new RegExp(blockPrefix + '(\\d+)___', 'g'),
                (_match, index: string) => blockPlaceholders[Number(index)]);
        }

        processed = processed.replace(/___LINK_PH_(\d+)___/g, (_, index) => {
            return linkPlaceholders[parseInt(index, 10)];
        });

        if (structured) processed = processed.replace(/&amp;(amp|lt|gt|quot|apos|#0*39|#\d+|#x[\da-f]+);/gi, '&$1;');

        processed = processed.replace(/\n/g, '<br />');

        return processed;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

}
