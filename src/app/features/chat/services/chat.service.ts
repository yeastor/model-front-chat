import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom, Observable, tap} from 'rxjs';
import {LocalStorageService} from '../../../core/services/local-storage.service';
import {environment} from '../../../../environments/environment';
import {ChatRequest, ChatResponse, MessageListItem, MessageListResponse, StartResponse} from '../models/chat.model';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient, private localStorageService: LocalStorageService) {
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

        return this.http.post<ChatResponse>(`${this.apiUrl}/model/chat/chat`, request).pipe(
            tap((response: ChatResponse) => {
                this.saveCategoryId(this.getAnswerCategoryId(response));
            })
        );
    }

    public async startChat(): Promise<string> {
        const response = await firstValueFrom(
            this.http.post<StartResponse>(`${this.apiUrl}/model/chat/start/start`, {})
        );

        return response.chat.id;
    }

    public async loadMessages(chatId: string): Promise<MessageListResponse> {
        const response = await firstValueFrom(
            this.http.post<MessageListResponse>(
                `${this.apiUrl}/model/chat/massage/list`,
                {id: chatId}
            )
        );

        this.saveCategoryId(this.getMessageCategoryId(response.message[response.message.length - 1]));

        return response;
    }

    formatContent(content: string): string {
        // Заменяем \n на <br /> и экранируем другие HTML символы
        return content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br />');
    }

    private getAnswerCategoryId(response: ChatResponse): string | null {
        return this.extractCategoryId(response.answer?.category?.id);
    }

    private getMessageCategoryId(message?: MessageListItem): string | null {
        return this.extractCategoryId(message?.category?.id);
    }

    private extractCategoryId(categoryId?: string): string | null {
        const trimmedCategoryId = categoryId?.trim();

        return trimmedCategoryId ? trimmedCategoryId : null;
    }

    private saveCategoryId(categoryId: string | null): void {
        if (!categoryId) {
            return;
        }

        this.localStorageService.setCategoryId(categoryId);
    }
}
