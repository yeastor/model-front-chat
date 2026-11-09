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
import { FormsModule } from '@angular/forms';
import {guidedLaunch, resumedGuidedMessages, savedGuidedText} from './services/guided-launch';

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    imports: [
        MessageBubbleComponent,
        MessageBadgesComponent,
        LoadingSpinnerComponent,
        ChatInputComponent,
        A11yModule,
        FormsModule,
    ],
    styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
    private existingChatId: string = '';
    private failedTurn?: {id: string; text: string; display: string; variantId?: string; categoryId?: string; guided?: GuidedState};
    private initialMessageTurnId?: string;
    private typingIntervals = new Set<ReturnType<typeof setInterval>>();
    private loadToken = 0;
    private launchParams = new URLSearchParams(window.location.search);

    topicMode = this.launchParams.get('topic_entry') === '1';
    topicPlaceholder = 'Уточните: что происходит сейчас? (например: просят выйти, досмотр, документы)';
    topicChips: ChatViewDto[] = [];
    topicContextError = false;
    topicIntro?: { title: string; description: string; contentHtml: string };
    private topicDraft?: ChatViewDto;
    private topicStartedNotified = false;
    private onTopicIntro = (event: MessageEvent): void => {
        if (!this.topicMode || event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== 'aizaschita:topic-intro') return;
        if (typeof event.data.title !== 'string' || typeof event.data.description !== 'string' || typeof event.data.contentHtml !== 'string') return;
        this.topicIntro = { title: event.data.title, description: event.data.description, contentHtml: event.data.contentHtml };
        this.cdr.detectChanges();
    };
    private topicDestroyed = false;
    messages: ChatMessage[] = [];
    isLoading = false;
    historyReady = false;
    historyError = false;
    sendError = false;
    articleGuidedQuestion = false;
    exportBusy = false;
    exportError = '';
    feedbackView?: ChatViewDto;
    feedbackText = '';
    feedbackConsent = false;
    feedbackLoading = false;
    feedbackError = '';
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
        if (this.topicMode) {
            window.addEventListener('message', this.onTopicIntro);
            window.parent.postMessage({ type: 'aizaschita:topic-ready' }, window.location.origin);
            void this.loadTopicContext();
        }

        this.subscriptions.add(
            this.chatListService.selectedChatId$.subscribe((chatId) => {
                if (!chatId) {
                    return;
                }

                void this.loadChatMessages(chatId);
            })
        );
    }

    async loadTopicContext(): Promise<void> {
        this.topicContextError = false;
        try {
            const categoryId = this.launchParams.get('category_id') || '';
            const stageId = this.launchParams.get('stage_id') || '';
            const context = await firstValueFrom(this.chatService.getTopicContext(categoryId, stageId));
            if (this.topicDestroyed) return;
            if (!context.entry.subcategory) throw new Error('topic unavailable');
            this.topicPlaceholder = context.chat.placeholder || 'Опишите ситуацию';
            this.topicChips = context.entry.subcategory.chips.map((chip, index) => ({ id: 'topic-' + index, type: 'badge', value: chip.label, question: chip.label, variantId: chip.variant_id, categoryId }));
            if (!this.existingChatId && !this.launchParams.get('chat_id')) this.historyReady = true;
        } catch { if (this.topicDestroyed) return; this.topicContextError = true; }
        this.cdr.detectChanges();
    }

    onTopicChip(view: ChatViewDto): void {
        if (!this.topicMode || this.messages.length || !this.topicChips.includes(view)) return;
        this.topicDraft = view;
    }

    ngOnDestroy(): void {
        this.topicDestroyed = true;
        window.removeEventListener('message', this.onTopicIntro);
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
        this.articleGuidedQuestion = false;
        this.pendingScroll = 'bottom';
        this.preparedPdf = undefined;
        this.shareOpen = false;
        this.feedbackView = undefined; this.feedbackText = ''; this.feedbackConsent = false;
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
                const content = this.chatService.formatContent(message.direction === 1 ? message.text : savedGuidedText(message.text));
                this.addMessage({
                    id: message.id + (message.direction === 1 ? ':user' : ':ai'),
                    content,
                    sender: message.direction == 1 ? 'user' : 'ai',
                    timestamp: new Date(),
                    isQuestion: message.direction !== 1 && /\[Уточнение; выберите ответ в чате\]$/.test(message.text),
                    isTyping: false,
                    displayContent: content
                });
            });

            if (!this.launchParams.has('chat_id')) this.launchParams.set('chat_id', chatId);
            const stored = this.localStorageService.getGuidedState(chatId);
            const launch = guidedLaunch(this.launchParams, chatId, messageList.message.length, stored);
            if (launch) {
                try {
                    const response = await firstValueFrom(this.chatService.sendGuided(chatId, '', launch.guided, true, undefined, launch.variantId));
                    if (token !== this.loadToken) return;
                    this.localStorageService.setGuidedState(chatId, response.guided);
                    this.localStorageService.replaceCategoryId(response.answer?.category?.id);
                    this.articleGuidedQuestion = !!response.guided?.entryVariantId && response.status === 'question';
                    const restored = this.mapResponseToMessages(response).map((message) => ({...message, content: this.chatService.formatContent(message.content), areViewsVisible: true}));
                    for (const message of resumedGuidedMessages(this.messages, restored)) this.addMessage(message);
                } catch {
                    // A stale graph or a temporarily unavailable runtime must not hide saved history.
                    if (token === this.loadToken) {
                        this.localStorageService.setGuidedState(chatId);
                        this.sendError = true;
                    }
                }
            }

            this.cdr.detectChanges();
            this.pendingScroll = [...this.messages].reverse().find(message => message.sender === 'ai' && message.content)?.id || 'bottom';
        } catch {
            if (token === this.loadToken) this.historyError = true;
        } finally {
            if (token === this.loadToken) {
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        }
        const initialMessage = this.launchParams.get('message')?.trim();
        if (token === this.loadToken && this.historyReady && !this.historyError && !this.messages.length && initialMessage) {
            this.launchParams.delete('message');
            // A reload during the first request must replay the same turn.
            this.initialMessageTurnId = chatId;
            this.onSendMessage(initialMessage);
        }
    }

    private pendingScroll: string | null = null;

    ngAfterViewChecked(): void {
        if (this.topicMode && this.hasAssistantAnswer && !this.topicStartedNotified) {
            this.topicStartedNotified = true;
            window.parent.postMessage({ type: 'aizaschita:topic-chat-started', id: this.existingChatId }, window.location.origin);
        }
        const target = this.pendingScroll;
        if (!target || !this.messagesContainer) return;
        this.pendingScroll = null;
        const container = this.messagesContainer.nativeElement as HTMLElement;
        const message = target === 'bottom' ? null : container.querySelector<HTMLElement>('[data-message-id="' + target + '"]');
        container.scrollTop = message ? message.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop : container.scrollHeight;
    }

    retryHistory(): void {
        if (!this.isLoading && this.existingChatId) void this.loadChatMessages(this.existingChatId);
    }

    get hasAssistantAnswer(): boolean {
        return this.historyReady && this.messages.some(message =>
            message.sender === 'ai' && !message.isTyping && !message.isQuestion && !!message.content.trim());
    }

    async exportPdf(share = false): Promise<void> {
        if (this.exportBusy || this.isLoading || !this.hasAssistantAnswer) return;
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

        const text = message.trim();
        const selected = this.topicMode && this.topicDraft?.question.trim() === text ? this.topicDraft : undefined;
        // Edits are a new user query; a chip's old variant must not override the new meaning.
        this.topicDraft = undefined;
        void this.sendChatMessage(text, text, selected?.variantId, selected?.categoryId);
    }

    async onViewClick(view: ChatViewDto): Promise<void> {
        if (this.isLoading || !this.messages.some((message) => message.areViewsVisible && message.views?.includes(view))) {
            return;
        }

        if(view.guided?.native?.kind === 'feedback') {
            this.feedbackView = view;
            this.feedbackText = '';
            this.feedbackConsent = false; this.feedbackLoading = true; this.feedbackError = '';
            const token=this.loadToken;
            this.cdr.detectChanges();
            try {
                const data=await this.chatService.exportChat(this.existingChatId);
                if(token!==this.loadToken || this.feedbackView!==view) return;
                this.feedbackText=data.message.map(m => (m.direction===1 ? 'Вы: ' : 'АЙзащита: ')+this.feedbackPreviewText(m.text)).join('\n\n');
            } catch {
                if(token===this.loadToken && this.feedbackView===view) this.feedbackError='Не удалось загрузить переписку. Закройте окно и попробуйте ещё раз.';
            } finally { if(token===this.loadToken) {this.feedbackLoading=false;this.cdr.detectChanges();} }
            return;
        }
        this.sendChatMessage(view.question, view.guided ? view.question : view.id, view.variantId, view.categoryId, view.guided);
    }

    private feedbackPreviewText(text: string): string {
        const doc = new DOMParser().parseFromString(this.chatService.formatContent(text), 'text/html');
        doc.querySelectorAll('br').forEach(node => node.replaceWith('\n'));
        doc.querySelectorAll('a').forEach(link => link.replaceWith(`${link.textContent} (${link.getAttribute('href') || ''})`));
        return doc.body.textContent || '';
    }

    closeFeedback(): void { this.feedbackView = undefined; this.feedbackText = ''; this.feedbackConsent = false; }

    submitFeedback(): void {
        const view = this.feedbackView;
        if(!view?.guided?.native || !this.feedbackConsent || this.feedbackText.trim().length < 3 || this.feedbackLoading || !!this.feedbackError || this.isLoading) return;
        const guided: GuidedState = {...view.guided, native: {...view.guided.native, kind: 'submit_feedback', consent: true}};
        this.closeFeedback();
        void this.sendChatMessage('Отправить переписку на разбор', 'Отправить переписку на разбор', view.variantId, view.categoryId, guided);
    }

    private async sendChatMessage(chatMessageView: string, sendToBackMessage: string, variantId?: string, categoryId?: string, guided?: GuidedState): Promise<void> {
        if (!chatMessageView || this.isLoading || !this.historyReady) {
            return;
        }
        if (!this.existingChatId) {
            if (!this.topicMode) return;
            this.isLoading = true;
            try {
                this.existingChatId = await this.chatListService.createChat(false);
                this.launchParams.set('chat_id', this.existingChatId);
                window.parent.postMessage({ type: 'aizaschita:topic-chat-selected', id: this.existingChatId }, window.location.origin);
            } catch {
                this.isLoading = false; this.sendError = true; this.cdr.detectChanges(); return;
            }
            this.isLoading = false;
        }
        const token = this.loadToken;
        const turnId = this.failedTurn?.text === sendToBackMessage ? this.failedTurn.id : this.initialMessageTurnId || crypto.randomUUID();
        this.initialMessageTurnId = undefined;
        this.failedTurn = {id: turnId, text: sendToBackMessage, display: chatMessageView, variantId, categoryId, guided};

        // The server binds the category to this chat. A category stored by another
        // tab or conversation must not constrain a fresh free-text request.
        const resolvedCategoryId = categoryId || (this.topicMode ? this.launchParams.get('category_id') : undefined) || undefined;

        this.sendError = false;
        this.pendingScroll = 'bottom';

        const userMessage: ChatMessage = {
            id: turnId + ":user",
            content: chatMessageView,
            sender: 'user',
            timestamp: new Date(),
            isTyping: false,
            displayContent: this.chatService.formatContent(chatMessageView),
            views: [],
            areViewsVisible: false
        };

        if (!this.messages.some(m => m.id === userMessage.id)) this.messages.push(userMessage);

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

        // Only explicit NEXT controls use guided. Free text starts a normal conversation turn.
        const request = !guided
            ? this.chatService.sendMessage(this.existingChatId, sendToBackMessage, variantId, resolvedCategoryId, this.messages.filter(m => m.sender === 'user').length === 1 && this.topicMode ? this.launchParams.get('stage_id') || undefined : undefined, this.localStorageService.getGuidedState(this.existingChatId), turnId)
            : this.chatService.sendGuided(this.existingChatId, sendToBackMessage, guided, false, resolvedCategoryId, undefined, turnId);
        const subscription = request.subscribe({
            next: async (response) => {
                this.failedTurn = undefined;
                this.chatListService.notifyShell();
                void this.chatListService.refresh().catch(() => {});
                if (token !== this.loadToken) return;
                this.localStorageService.setGuidedState(this.existingChatId, response.guided);
                this.localStorageService.replaceCategoryId(response.answer?.category?.id);
                this.messages.pop();
                for (const message of this.messages) message.areViewsVisible = false;
                this.articleGuidedQuestion = !!response.guided?.entryVariantId && response.status === 'question';

                this.isLoading = false;
                this.cdr.detectChanges();

                const aiMessages = this.mapResponseToMessages(response);

                if (aiMessages.length === 0) {
                    this.addErrorMessage();
                    return;
                }

                for (const aiMessage of aiMessages) {
                    if (token !== this.loadToken) return;
                    this.addMessage({...aiMessage, content: this.chatService.formatContent(aiMessage.content), areViewsVisible: true});
                }
                this.pendingScroll = aiMessages[0].id;
                this.cdr.detectChanges();
            },
            error: (error) => {
                this.chatListService.notifyShell();
                if (token !== this.loadToken) return;
                console.error('Error sending message:', error);
                this.messages.pop();
                this.isLoading = false;
                this.addErrorMessage();
                if (error.status === 409) { this.failedTurn = undefined; void this.loadChatMessages(this.existingChatId); }
            }
        });

        this.subscriptions.add(subscription);
    }

    private mapResponseToMessages(response: ChatResponse): ChatMessage[] {


        if (!response.answer?.content) {
            return [];
        }

        let res : ChatMessage[] = [{
            id: response.turn?.messageId ? response.turn.messageId + ":ai" : response.presentation?.responseId || this.generateId(),
            content: response.answer?.content ?? '',
            isQuestion: response.status === 'question',
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


                if (next.type === 'choice' && next.questionText === response.answer.content) {
                    res[0].views = views; res[0].isQuestion = true;
                    continue;
                }
                res.push(
                    {
                        isQuestion: next.type === 'choice',
                        id: (response.presentation?.responseId || this.generateId()) + ":next:" + res.length,
                        content: next.type == 'choice' && next.questionText !== response.answer.content ? next.questionText : '',
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

    retryTurn(): void {
        const pending = this.failedTurn;
        if (pending) void this.sendChatMessage(pending.display, pending.text, pending.variantId, pending.categoryId, pending.guided);
    }

    private addErrorMessage(): void {
        this.sendError = true;
        this.cdr.detectChanges();
    }

    private addMessage(message: ChatMessage): void {
        if (this.messages.some(m => m.id === message.id)) return;
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

}
