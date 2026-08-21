import {Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable, Subscription} from 'rxjs';

import {LocalStorageService} from '../../core/services/local-storage.service';
import {ChatService} from './services/chat.service';
import {
    ChatAnswerSelectionDto,
    ChatLegacyNextDto,
    ChatMessage,
    ChatNextDto,
    ChatResponse,
    ChatViewDto
} from './models/chat.model';
import {readChatLaunchParams} from './models/chat-launch';
import {normalizeChatNextQuestion} from './models/chat-next';
import {MessageBubbleComponent} from './components/message-bubble/message-bubble.component';
import {MessageBadgesComponent} from './components/message-badges/message-badges.component';
import {TypedNextQuestionComponent} from './components/typed-next-question/typed-next-question.component';
import {LoadingSpinnerComponent} from '../../shared/components/loading-spinner/loading-spinner.component';
import {ChatInputComponent} from './components/chat-input/chat-input.component';

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    imports: [
        MessageBubbleComponent,
        MessageBadgesComponent,
        TypedNextQuestionComponent,
        LoadingSpinnerComponent,
        ChatInputComponent,
    ],
    styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLElement>;
    private existingChatId = '';
    private typingIntervals = new Set<ReturnType<typeof setInterval>>();

    messages: ChatMessage[] = [];
    isLoading = false;
    private subscriptions = new Subscription();

    constructor(
        private chatService: ChatService,
        private cdr: ChangeDetectorRef,
        private localStorageService: LocalStorageService,
        private route: ActivatedRoute
    ) {
    }

    async ngOnInit(): Promise<void> {
        const chatId = this.localStorageService.getChatId();

        this.localStorageService.flushCategoryId();

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
                    sender: message.direction === 1 ? 'user' : 'ai',
                    timestamp: new Date(),
                    isTyping: false,
                    displayContent: this.chatService.formatContent(message.text)
                });
            });
        } else {
            const launch = readChatLaunchParams(this.route.snapshot.queryParamMap);
            const startResponse = await this.chatService.startChat(launch);
            this.existingChatId = startResponse.chat.id;
            this.localStorageService.setChatId(this.existingChatId);

            const launchMessages = this.mapResponseToMessages(startResponse);
            if (launchMessages.length > 0) {
                launchMessages.forEach((message) => this.addMessage({
                    ...message,
                    areViewsVisible: true
                }));
            } else {
                this.addStartMessage();
            }
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

        this.sendChatMessage(message.trim(), message.trim());
    }

    onViewClick(view: ChatViewDto): void {
        if (this.isLoading) {
            return;
        }

        this.sendChatMessage(view.question, view.id, view.categoryId);
    }

    onNextAnswer(selection: ChatAnswerSelectionDto): void {
        if (this.isLoading) {
            return;
        }

        const question = [...this.messages]
            .reverse()
            .find((message) => message.nextQuestion?.id === selection.question_id)
            ?.nextQuestion;
        const answerLabel = question?.answers.find((answer) => answer.key === selection.answer_key)?.label;
        if (!answerLabel) {
            return;
        }

        this.sendChatRequest(
            answerLabel,
            this.chatService.sendTypedAnswer(this.existingChatId, selection)
        );
    }

    private sendChatMessage(chatMessageView: string, sendToBackMessage: string, categoryId?: string): void {
        if (!chatMessageView) {
            return;
        }

        const resolvedCategoryId = categoryId || this.localStorageService.getCategoryId() || undefined;
        this.sendChatRequest(
            chatMessageView,
            this.chatService.sendMessage(this.existingChatId, sendToBackMessage, resolvedCategoryId)
        );
    }

    private sendChatRequest(chatMessageView: string, response: Observable<ChatResponse>): void {
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

        const subscription = response.subscribe({
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
        if (!response.answer) {
            return [];
        }

        const res: ChatMessage[] = [];
        if (response.answer.content) {
            res.push({
                id: this.generateId(),
                content: response.answer.content,
                sender: 'ai',
                timestamp: new Date(),
                isTyping: false,
                displayContent: '',
                areViewsVisible: false
            });
        }

        for (const next of response.answer.next ?? []) {
            const typedQuestion = normalizeChatNextQuestion(next);
            if (typedQuestion) {
                res.push({
                    id: this.generateId(),
                    content: '',
                    sender: 'ai',
                    timestamp: new Date(),
                    isTyping: false,
                    displayContent: '',
                    nextQuestion: typedQuestion,
                    areViewsVisible: false
                });
                continue;
            }

            if (this.isLegacyNext(next)) {
                const views: ChatViewDto[] = [];
                for (const view of next.view) {
                    views.push({
                        categoryId: view.categoryId,
                        id: view.id,
                        question: view.question || next.questionText,
                        type: view.type,
                        value: view.value
                    });
                }

                res.push({
                    id: this.generateId(),
                    content: next.type === 'choice' ? next.questionText : '',
                    sender: 'ai',
                    timestamp: new Date(),
                    isTyping: false,
                    displayContent: '',
                    views,
                    areViewsVisible: false
                });
            }
        }

        return res;
    }

    private isLegacyNext(next: ChatNextDto): next is ChatLegacyNextDto {
        return 'view' in next && Array.isArray(next.view);
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
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    private scrollToBottom(): void {
        try {
            this.messagesContainer.nativeElement.scrollTop =
                this.messagesContainer.nativeElement.scrollHeight;
        } catch {
        }
    }

    private addStartMessage(): void {
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
