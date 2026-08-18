import {Injectable} from '@angular/core';
import {BehaviorSubject, firstValueFrom, Observable} from 'rxjs';
import {LocalStorageService} from '../../../core/services/local-storage.service';
import {ChatService} from './chat.service';
import {ChatListItem} from '../models/chat.model';

@Injectable({
    providedIn: 'root'
})
export class ChatListService {
    private chats: ChatListItem[] = [];
    private chatsSubject = new BehaviorSubject<ChatListItem[]>([]);
    private selectedChatIdSubject = new BehaviorSubject<string | null>(null);
    private canCreateChatSubject = new BehaviorSubject<boolean>(false);

    public chats$: Observable<ChatListItem[]> = this.chatsSubject.asObservable();
    public selectedChatId$: Observable<string | null> = this.selectedChatIdSubject.asObservable();
    public canCreateChat$: Observable<boolean> = this.canCreateChatSubject.asObservable();

    constructor(
        private chatService: ChatService,
        private localStorageService: LocalStorageService
    ) {
    }

    public async init(): Promise<void> {
        const list = await firstValueFrom(this.chatService.getList());

        if (list.chats.length > 0) {
            this.chats = list.chats;
            this.chatsSubject.next(this.chats);
            this.canCreateChatSubject.next(true);

            const firstChatId = list.chats[0].id;
            this.localStorageService.setChatId(firstChatId);
            this.selectedChatIdSubject.next(firstChatId);
            return;
        }

        let chatId = this.localStorageService.getChatId();

        if (!chatId) {
            chatId = await this.chatService.startChat();
            this.localStorageService.setChatId(chatId);
        }

        this.chats = [{id: chatId, name: 'Новый чат'}];
        this.chatsSubject.next(this.chats);
        this.selectedChatIdSubject.next(chatId);
    }

    public selectChat(chatId: string): void {
        this.localStorageService.setChatId(chatId);
        this.selectedChatIdSubject.next(chatId);
    }

    public async createChat(): Promise<string> {
        const chatId = await this.chatService.startChat();
        this.localStorageService.setChatId(chatId);

        this.chats = [...this.chats, {id: chatId, name: 'Новый чат'}];
        this.chatsSubject.next(this.chats);
        this.selectedChatIdSubject.next(chatId);

        return chatId;
    }
}
