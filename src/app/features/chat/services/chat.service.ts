import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom, Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ChatRequest, ChatResponse, MessageListResponse, StartResponse} from '../models/chat.model';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {
    }

    public sendMessage(chatId: string, message: string): Observable<ChatResponse> {
        const request: ChatRequest = {
            question: {q: message},
            chat: {id: chatId}
        };
        return this.http.post<ChatResponse>(`${this.apiUrl}/model/chat/chat`, request);
    }

    public async startChat(): Promise<string> {
        const response = await firstValueFrom(
            this.http.post<StartResponse>(`${this.apiUrl}/model/chat/start/start`, {})
        );

        return response.chat.id;
    }

    public async loadMessages(chatId: string): Promise<MessageListResponse> {
        return await firstValueFrom(
            this.http.post<MessageListResponse>(
                `${this.apiUrl}/model/chat/massage/list`,
                {id: chatId}
            )
        )
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
}
