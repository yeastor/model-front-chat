import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ChatRequest, ChatResponse } from '../models/chat.model';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    sendMessage(message: string): Observable<ChatResponse> {
        const request: ChatRequest = { q: message };
        return this.http.post<ChatResponse>(`${this.apiUrl}/model/chat`, request);
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
