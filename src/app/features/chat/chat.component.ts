import {AfterViewChecked, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {firstValueFrom, Subscription} from 'rxjs';
import {LocalStorageService} from '../../core/services/local-storage.service';
import {ChatService} from './services/chat.service';
import {ChatListService} from './services/chat-list.service';
import {ChatMessage, ChatResponse, ChatViewDto, GuidedState} from './models/chat.model';
import {MessageBubbleComponent} from './components/message-bubble/message-bubble.component';
import {MessageBadgesComponent} from './components/message-badges/message-badges.component';
import {LoadingSpinnerComponent} from '../../shared/components/loading-spinner/loading-spinner.component';
import {ChatInputComponent} from './components/chat-input/chat-input.component';
import { ChatPdfService } from './services/chat-pdf.service';
import { A11yModule } from '@angular/cdk/a11y';

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    imports: [
        MessageBubbleComponent,
        MessageBadgesComponent,
        LoadingSpinnerComponent,
        ChatInputComponent,
        A11yModule,
    ],
    styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
    private existingChatId: string = '';
    private typingIntervals = new Set<ReturnType<typeof setInterval>>();
    private loadToken = 0;

    messages: ChatMessage[] = [];
    isLoading = false;
    historyReady = false;
    historyError = false;
    sendError = false;
    exportBusy = false;
    exportError = '';
    shareOpen = false;
    shareSupported = false;
    preparedPdf?: File;
    private subscriptions = new Subscription();

    constructor(
        private chatService: ChatService,
        private cdr: ChangeDetectorRef,
        private localStorageService: LocalStorageService,
        private chatListService: ChatListService,
        private chatPdfService: ChatPdfService
    ) {
    }

    ngOnInit(): void {
        this.localStorageService.flushCategoryId();

        this.subscriptions.add(
            this.chatListService.selectedChatId$.subscribe((chatId) => {
                if (!chatId) {
                    return;
                }

                void this.loadChatMessages(chatId);
            })
        );
    }

    ngOnDestroy(): void {
        ++this.loadToken;
        this.preparedPdf = undefined;
        this.subscriptions.unsubscribe();
        this.typingIntervals.forEach((intervalId) => clearInterval(intervalId));
        this.typingIntervals.clear();
    }

    private async loadChatMessages(chatId: string): Promise<void> {
        const token = ++this.loadToken;

        this.existingChatId = chatId;
        this.messages = [];
        this.isLoading = true;
        this.historyReady = false;
        this.historyError = false;
        this.sendError = false;
        this.followLatest = true;
        this.preparedPdf = undefined;
        this.shareOpen = false;
        this.exportError = '';
        this.exportBusy = false;
        this.localStorageService.flushCategoryId();

        try {
            const messageList = await this.chatService.loadMessages(chatId);

            if (token !== this.loadToken) {
                return;
            }
            this.localStorageService.replaceCategoryId(messageList.message.at(-1)?.category?.id);
            this.historyReady = true;

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

            const params = new URLSearchParams(window.location.search);
            const stored = this.localStorageService.getGuidedState(chatId);
            const launch = !messageList.message.length && params.get('category_id') && params.get('stage_id')
                ? {categoryId: params.get('category_id')!, stageId: params.get('stage_id')!, context: {}} : undefined;
            const state = stored || launch;
            if (state || !messageList.message.length) {
                try {
                    const response = await firstValueFrom(this.chatService.sendGuided(chatId, '', state || {context: {}}, true));
                    if (token !== this.loadToken) return;
                    this.localStorageService.setGuidedState(chatId, response.guided);
                    this.localStorageService.replaceCategoryId(response.answer?.category?.id);
                    for (const message of this.mapResponseToMessages(response)) this.addMessage({...message, content: this.chatService.formatContent(message.content), areViewsVisible: true});
                } catch {
                    // A stale graph or a temporarily unavailable runtime must not hide saved history.
                    if (token === this.loadToken) {
                        this.localStorageService.setGuidedState(chatId);
                        this.sendError = true;
                    }
                }
            }

            this.cdr.detectChanges();
            this.scrollToBottom();
        } catch {
            if (token === this.loadToken) this.historyError = true;
        } finally {
            if (token === this.loadToken) {
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        }
    }

    ngAfterViewChecked(): void {
        // Leave the reader's scroll position alone while they browse older messages.
        if (this.followLatest) this.scrollToBottom();
    }

    private followLatest = true;

    onMessagesScroll(): void {
        const element = this.messagesContainer.nativeElement as HTMLElement;
        this.followLatest = element.scrollHeight - element.clientHeight - element.scrollTop < 80;
    }

    retryHistory(): void {
        if (!this.isLoading && this.existingChatId) void this.loadChatMessages(this.existingChatId);
    }

    async exportPdf(share = false): Promise<void> {
        if (this.exportBusy || this.isLoading || !this.historyReady) return;
        const token = this.loadToken;
        this.exportBusy = true;
        this.exportError = '';
        try {
            const data = await this.chatService.exportChat(this.existingChatId);
            if (token !== this.loadToken || data.chat.id !== this.existingChatId) return;
            const file = await this.chatPdfService.create(data);
            if (token !== this.loadToken) return;
            if (share) {
                this.preparedPdf = file;
                this.shareSupported = !!navigator.canShare?.({ files: [file] });
                this.shareOpen = true;
            } else this.chatPdfService.download(file);
        } catch {
            if (token === this.loadToken) this.exportError = 'Не удалось подготовить PDF. Проверьте соединение и попробуйте ещё раз.';
        } finally {
            if (token === this.loadToken) { this.exportBusy = false; this.cdr.detectChanges(); }
        }
    }

    closeShare(): void { this.shareOpen = false; this.preparedPdf = undefined; }

    async confirmShare(): Promise<void> {
        const file = this.preparedPdf;
        if (!file) return;
        const token = this.loadToken;
        try {
            // This separate explicit click preserves Web Share user activation.
            if (this.shareSupported) await navigator.share({ files: [file] });
            else this.chatPdfService.download(file);
            if (token === this.loadToken) this.closeShare();
        } catch (error) {
            if (token !== this.loadToken) return;
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
                this.exportError = 'Браузер не смог поделиться файлом. Скачайте PDF и отправьте его самостоятельно.';
            }
            this.closeShare();
        } finally { if (token === this.loadToken) this.cdr.detectChanges(); }
    }

    onSendMessage(message: string): void {
        if (!message.trim()) return;

        this.sendChatMessage(message.trim(), message.trim());
    }

    onViewClick(view: ChatViewDto): void {
        if (this.isLoading) {
            return;
        }

        this.sendChatMessage(view.question, view.guided ? view.question : view.id, view.variantId, view.categoryId, view.guided);
    }

    private sendChatMessage(chatMessageView: string, sendToBackMessage: string, variantId?: string, categoryId?: string, guided?: GuidedState): void {
        if (!chatMessageView || this.isLoading || !this.historyReady) {
            return;
        }
        const token = this.loadToken;

        const resolvedCategoryId = categoryId || this.localStorageService.getCategoryId() || undefined;

        this.sendError = false;
        this.followLatest = true;

        const userMessage: ChatMessage = {
            id: this.generateId(),
            content: chatMessageView,
            sender: 'user',
            timestamp: new Date(),
            isTyping: false,
            displayContent: this.chatService.formatContent(chatMessageView),
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

        // Legacy buttons keep their route. Free text and guided controls use explicit facts.
        const request = variantId && !guided
            ? this.chatService.sendMessage(this.existingChatId, sendToBackMessage, variantId, resolvedCategoryId)
            : this.chatService.sendGuided(this.existingChatId, sendToBackMessage, guided, false, resolvedCategoryId);
        const subscription = request.subscribe({
            next: async (response) => {
                this.chatListService.notifyShell();
                void this.chatListService.refresh().catch(() => {});
                if (token !== this.loadToken) return;
                this.localStorageService.setGuidedState(this.existingChatId, response.guided);
                this.localStorageService.replaceCategoryId(response.answer?.category?.id);
                this.messages.pop();

                this.isLoading = false;
                this.cdr.detectChanges();

                const aiMessages = this.mapResponseToMessages(response);

                if (aiMessages.length === 0) {
                    this.addErrorMessage();
                    return;
                }

                for (const aiMessage of aiMessages) {
                    if (token !== this.loadToken) return;
                    if (response.guided) this.addMessage({...aiMessage, content: this.chatService.formatContent(aiMessage.content), areViewsVisible: true});
                    else {
                        this.messages.push(aiMessage);
                        await this.typeMessage(aiMessage);
                    }
                }
                this.cdr.detectChanges();
            },
            error: (error) => {
                this.chatListService.notifyShell();
                if (token !== this.loadToken) return;
                console.error('Error sending message:', error);
                this.messages.pop();
                this.isLoading = false;
                this.addErrorMessage();
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
                            guided: v.guided,
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
        const token = this.loadToken;
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
                if (token !== this.loadToken) {
                    clearInterval(typeWriter);
                    this.typingIntervals.delete(typeWriter);
                    resolve();
                    return;
                }
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
        this.sendError = true;
        this.cdr.detectChanges();
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

}
