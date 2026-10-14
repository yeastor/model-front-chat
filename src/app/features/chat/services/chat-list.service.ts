import {Injectable} from '@angular/core';
import {BehaviorSubject, firstValueFrom, Observable} from 'rxjs';
import {LocalStorageService} from '../../../core/services/local-storage.service';
import {ChatService} from './chat.service';
import {ChatListItem} from '../models/chat.model';

@Injectable({providedIn: 'root'})
export class ChatListService {
    private chats: ChatListItem[] = [];
    private chatsSubject = new BehaviorSubject<ChatListItem[]>([]);
    private selectedChatIdSubject = new BehaviorSubject<string | null>(null);
    private canCreateChatSubject = new BehaviorSubject<boolean>(false);

    public chats$: Observable<ChatListItem[]> = this.chatsSubject.asObservable();
    public selectedChatId$: Observable<string | null> = this.selectedChatIdSubject.asObservable();
    public canCreateChat$: Observable<boolean> = this.canCreateChatSubject.asObservable();

    constructor(private chatService: ChatService, private localStorageService: LocalStorageService) {
    }

    public async init(): Promise<void> {
        await this.refresh();
        const requested = new URLSearchParams(window.location.search).get('chat_id');
        if (requested && !this.chats.some((chat) => chat.id === requested)) {
            throw new Error('Chat not found or access denied');
        }
        const previous = this.localStorageService.getChatId();
        const selected = requested || this.chats.find((chat) => chat.id === previous)?.id || this.chats[0]?.id;
        if (selected) {
            this.selectChat(selected);
        } else {
            await this.createChat();
        }
    }

    public async refresh(): Promise<void> {
        const list = await firstValueFrom(this.chatService.getList());
        this.chats = list.chats;
        this.chatsSubject.next(this.chats);
        this.canCreateChatSubject.next(true);
    }

    public notifyShell(): void {
        if (window.parent !== window) {
            window.parent.postMessage({type: 'aizaschita:chats-changed'}, window.location.origin);
        }
    }

    public selectChat(chatId: string): void {
        if (!this.chats.some((chat) => chat.id === chatId)) {
            throw new Error('Chat access denied');
        }
        if (this.selectedChatIdSubject.value === chatId) {
            return;
        }
        this.localStorageService.setChatId(chatId);
        this.selectedChatIdSubject.next(chatId);
        const url = new URL(window.location.href);
        url.searchParams.set('chat_id', chatId);
        window.history.replaceState(null, '', url);
    }

    public async createChat(): Promise<string> {
        const chatId = await this.chatService.startChat();
        this.chats = [{id: chatId, name: 'Новый чат'}, ...this.chats];
        this.chatsSubject.next(this.chats);
        this.selectChat(chatId);
        this.notifyShell();
        return chatId;
    }
}
