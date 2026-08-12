import {Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef} from '@angular/core';
import {firstValueFrom, Subscription} from 'rxjs';
import {LocalStorageService} from '../../core/services/local-storage.service';
import {ChatService} from './services/chat.service';
import {ChatMessage, ChatResponse, ChatViewDto} from './models/chat.model';
import {MessageBubbleComponent} from './components/message-bubble/message-bubble.component';
import {MessageBadgesComponent} from './components/message-badges/message-badges.component';
import {LoadingSpinnerComponent} from '../../shared/components/loading-spinner/loading-spinner.component';
import {ChatInputComponent} from './components/chat-input/chat-input.component';

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    imports: [
        MessageBubbleComponent,
        MessageBadgesComponent,
        LoadingSpinnerComponent,
        ChatInputComponent,
    ],
    styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
    private existingChatId: string = '';
    private typingIntervals = new Set<ReturnType<typeof setInterval>>();

    messages: ChatMessage[] = [];
    isLoading = false;
    private subscriptions = new Subscription();

    constructor(
        private chatService: ChatService,
        private cdr: ChangeDetectorRef,
        private localStorageService: LocalStorageService
    ) {
    }

    async ngOnInit(): Promise<void> {
        this.localStorageService.flushCategoryId();

        const list = await firstValueFrom(this.chatService.getList());

        let chatId = this.localStorageService.getChatId();

        if (list.chats.length > 0) {
            chatId = list.chats[0].id;
            this.localStorageService.setChatId(chatId);
        } else if (!chatId) {
            const newChatId = await this.chatService.startChat();
            this.existingChatId = newChatId;
            this.localStorageService.setChatId(newChatId);

            this.addStartMessage();

            this.cdr.detectChanges();
            return;
        }

        this.existingChatId = chatId;
        const messageList = await this.chatService.loadMessages(this.existingChatId);
        if (messageList.message.length < 1) {
            this.addStartMessage();
        }

        messageList.message.forEach((message) => {
            this.addMessage({
                id: message.id,
                content: this.chatService.formatContent(message.text),
                sender: message.direction == 1 ? 'user' : 'ai',
                timestamp: new Date(),
                isTyping: false,
                displayContent: this.chatService.formatContent(message.text)
            });
        });

        this.cdr.detectChanges();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        this.typingIntervals.forEach((intervalId) => clearInterval(intervalId));
        this.typingIntervals.clear();
    }

    ngAfterViewChecked(): void {
        this.scrollToBottom();
    }

    onSendMessage(message: string): void {
        if (!message.trim()) return;

        this.sendChatMessage(message.trim(), message.trim());
    }

    onViewClick(view: ChatViewDto): void {
        if (this.isLoading) {
            return;
        }

        this.sendChatMessage(view.question, view.id, view.variantId, view.categoryId);
    }

    private sendChatMessage(chatMessageView: string, sendToBackMessage: string, variantId?: string, categoryId?: string): void {
        if (!chatMessageView) {
            return;
        }

        const resolvedCategoryId = categoryId || this.localStorageService.getCategoryId() || undefined;

        const userMessage: ChatMessage = {
            id: this.generateId(),
            content: chatMessageView,
            sender: 'user',
            timestamp: new Date(),
            isTyping: false,
            displayContent: chatMessageView,
            views: [],
            areViewsVisible: false
        };

        this.messages.push(userMessage);

        const typingMessage: ChatMessage = {
            id: this.generateId(),
            content: '',
            sender: 'ai',
            timestamp: new Date(),
            isTyping: true,
            displayContent: '',
            views: [],
            areViewsVisible: false
        };
        this.messages.push(typingMessage);

        this.isLoading = true;

        const subscription = this.chatService.sendMessage(this.existingChatId, sendToBackMessage, variantId, resolvedCategoryId).subscribe({
            next: async (response) => {
                this.messages.pop();

                this.isLoading = false;
                this.cdr.detectChanges();

                const aiMessages = this.mapResponseToMessages(response);

                if (aiMessages.length === 0) {
                    this.addErrorMessage();
                    return;
                }

                for (const aiMessage of aiMessages) {
                    this.messages.push(aiMessage);
                    await this.typeMessage(aiMessage);
                }
            },
            error: (error) => {
                console.error('Error sending message:', error);
                this.messages.pop();
                this.addErrorMessage();
                this.isLoading = false;
            }
        });

        this.subscriptions.add(subscription);
    }

    private mapResponseToMessages(response: ChatResponse): ChatMessage[] {


        if (!response.answer?.content) {
            return [];
        }

        let res : ChatMessage[] = [{
            id: this.generateId(),
            content: response.answer?.content ?? '',
            sender: 'ai' as const,
            timestamp: new Date(),
            isTyping: false,
            displayContent: '',
            areViewsVisible: false
        }]

        if (response.answer?.next && response.answer?.next.length > 0) {
            for (const next of response.answer?.next) {
                let views : ChatViewDto[] = [];
                for (let v of next.view) {
                    views.push(
                        {
                            categoryId: v.categoryId,
                            id: v.id,
                            question: v.question || next.questionText,
                            type: v.type,
                            value: v.value,
                            variantId: v.variantId,
                        }
                    );
                }


                res.push(
                    {
                        id: this.generateId(),
                        content: next.type == 'choice' ? next.questionText : '',
                        sender: 'ai' as const,
                        timestamp: new Date(),
                        isTyping: false,
                        displayContent: '',
                        views: views,
                        areViewsVisible: false
                    }
                );
            }
        }

        return res;
    }

    private typeMessage(message: ChatMessage): Promise<void> {
        const formattedContent: string = this.chatService.formatContent(message.content);
        let index: number = 0;
        const speed = 20;

        if (!formattedContent) {
            message.areViewsVisible = true;
            this.cdr.detectChanges();
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const typeWriter = setInterval(() => {
                if (index < formattedContent.length) {
                    message.displayContent += formattedContent.charAt(index);
                    index++;
                    this.cdr.detectChanges();
                } else {
                    clearInterval(typeWriter);
                    this.typingIntervals.delete(typeWriter);
                    message.areViewsVisible = true;
                    this.cdr.detectChanges();
                    resolve();
                }
            }, speed);

            this.typingIntervals.add(typeWriter);
        });
    }

    private addErrorMessage(): void {
        const errorMessage: ChatMessage = {
            id: this.generateId(),
            content: 'Извините, произошла ошибка. Пожалуйста, попробуйте еще раз.',
            sender: 'ai',
            timestamp: new Date(),
            isTyping: false,
            displayContent: '',
            views: [],
            areViewsVisible: false
        };
        this.messages.push(errorMessage);
        void this.typeMessage(errorMessage);
    }

    private addMessage(message: ChatMessage): void {
        this.messages.push({
            ...message,
            displayContent: message.content,
            views: message.views ?? [],
            areViewsVisible: message.areViewsVisible ?? true
        });
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private scrollToBottom(): void {
        try {
            this.messagesContainer.nativeElement.scrollTop =
                this.messagesContainer.nativeElement.scrollHeight;
        } catch (err) {
        }
    }

    private addStartMessage() {
        this.addMessage({
            id: this.generateId(),
            content: 'Привет! Я ваш AI помощник. Чем могу помочь?',
            sender: 'ai',
            timestamp: new Date(),
            isTyping: false,
            displayContent: ''
        });
    }

}
