import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {Subscription} from 'rxjs';
import {MatIcon} from '@angular/material/icon';
import {MatIconButton} from '@angular/material/button';
import {ChatListService} from '../../services/chat-list.service';
import {ChatListItem} from '../../models/chat.model';

@Component({
    selector: 'app-chat-list',
    templateUrl: './chat-list.component.html',
    imports: [
        MatIcon,
        MatIconButton
    ],
    styleUrls: ['./chat-list.component.scss']
})
export class ChatListComponent implements OnInit, OnDestroy {
    @Input() showToggleButton = true;

    chats: ChatListItem[] = [];
    selectedChatId: string | null = null;
    canCreateChat = false;
    isOpen = true;

    private subscriptions = new Subscription();

    constructor(private chatListService: ChatListService) {
    }

    ngOnInit(): void {
        this.isOpen = window.matchMedia('(min-width: 769px)').matches;

        this.subscriptions.add(
            this.chatListService.chats$.subscribe((chats) => {
                this.chats = chats;
            })
        );

        this.subscriptions.add(
            this.chatListService.selectedChatId$.subscribe((chatId) => {
                this.selectedChatId = chatId;
            })
        );

        this.subscriptions.add(
            this.chatListService.canCreateChat$.subscribe((canCreateChat) => {
                this.canCreateChat = canCreateChat;
            })
        );

        void this.chatListService.init();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    toggleMenu(): void {
        this.isOpen = !this.isOpen;
    }

    selectChat(chat: ChatListItem): void {
        this.chatListService.selectChat(chat.id);
        if (window.matchMedia('(max-width: 768px)').matches) {
            this.isOpen = false;
        }
    }

    createChat(): void {
        void this.chatListService.createChat().then(() => {
            if (window.matchMedia('(max-width: 768px)').matches) {
                this.isOpen = false;
            }
        });
    }
}
