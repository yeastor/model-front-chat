import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom, Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ChatListResponse, ChatRequest, ChatResponse, GuidedState, MessageListResponse, StartResponse} from '../models/chat.model';
import { ChatExport } from './chat-pdf.service';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    public sendGuided(chatId: string, question: string, guided?: GuidedState, resume = false, categoryId?: string): Observable<ChatResponse> {
        return this.http.post<ChatResponse>(`${this.apiUrl}/guided`, {id: chatId, question, guided, resume, categoryId});
    }
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {
    }

    public sendMessage(chatId: string, message: string, variantId?: string, categoryId?: string): Observable<ChatResponse> {
        const request: ChatRequest = {
            question: {
                q: message,
                ...(variantId ? {variant: {id: variantId}} : {}),
                ...(categoryId ? {category: {id: categoryId}} : {})
            },
            chat: {id: chatId}
        };

        return this.http.post<ChatResponse>(`${this.apiUrl}/chat`, request);
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

        return response;
    }

    formatContent(content: string): string {
        const linkPlaceholders: string[] = [];

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
            if (href) {
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

        processed = this.escapeHtml(processed);

        processed = processed.replace(/___LINK_PH_(\d+)___/g, (_, index) => {
            return linkPlaceholders[parseInt(index, 10)];
        });

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
