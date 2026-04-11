import {Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef} from '@angular/core';
import {ChatService} from './services/chat.service';
import {ChatMessage, ChatResponse, ChatViewDto} from './models/chat.model';
import {Subscription} from 'rxjs';
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
    private chatIdKey = 'chatId';
    private existingChatId: string = '';
    private typingIntervals = new Set<ReturnType<typeof setInterval>>();

    messages: ChatMessage[] = [];
    isLoading = false;
    private subscriptions = new Subscription();

    constructor(private chatService: ChatService, private cdr: ChangeDetectorRef) {
    }

    async ngOnInit(): Promise<void> {

        const chatId = localStorage.getItem(this.chatIdKey);

        if (chatId) {
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
        } else {
            const chatId = await this.chatService.startChat();
            this.existingChatId = chatId;
            localStorage.setItem(this.chatIdKey, chatId);

            this.addStartMessage();
        }
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

        this.sendChatMessage(message.trim());
    }

    onViewClick(view: ChatViewDto): void {
        if (this.isLoading) {
            return;
        }

        this.sendChatMessage(view.question, view.id);
    }

    private sendChatMessage(message: string, variantId?: string): void {
        if (!message) {
            return;
        }

        const userMessage: ChatMessage = {
            id: this.generateId(),
            content: message,
            sender: 'user',
            timestamp: new Date(),
            isTyping: false,
            displayContent: message,
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

        const subscription = this.chatService.sendMessage(this.existingChatId, message, variantId).subscribe({
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
        const views: ChatViewDto[] = (response.answer?.next ?? []).flatMap((nextItem): ChatViewDto[] =>
            (nextItem.view ?? []).map((view: ChatViewDto) => ({
                ...view,
                question: view.question || nextItem.questionText
            }))
        );

        if (!response.answer?.content && views.length === 0) {
            return [];
        }

        return [{
            id: this.generateId(),
            content: response.answer?.content ?? '',
            sender: 'ai' as const,
            timestamp: new Date(),
            isTyping: false,
            displayContent: '',
            views,
            areViewsVisible: false
        }];
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
