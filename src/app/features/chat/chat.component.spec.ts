import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap} from '@angular/router';
import {NEVER} from 'rxjs';

import {LocalStorageService} from '../../core/services/local-storage.service';
import {ChatComponent} from './chat.component';
import {ChatService} from './services/chat.service';

describe('ChatComponent', () => {
    let fixture: ComponentFixture<ChatComponent>;
    let component: ChatComponent;
    let chatService: jasmine.SpyObj<ChatService>;
    let localStorageService: jasmine.SpyObj<LocalStorageService>;
    let queryParamMap: ReturnType<typeof convertToParamMap>;

    const createComponent = async (): Promise<void> => {
        await TestBed.configureTestingModule({
            imports: [ChatComponent],
            providers: [
                {provide: ChatService, useValue: chatService},
                {provide: LocalStorageService, useValue: localStorageService},
                {
                    provide: ActivatedRoute,
                    useValue: {snapshot: {queryParamMap}}
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ChatComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    beforeEach(() => {
        chatService = jasmine.createSpyObj<ChatService>('ChatService', [
            'startChat',
            'loadMessages',
            'formatContent',
            'sendMessage',
            'sendTypedAnswer'
        ]);
        chatService.formatContent.and.callFake((content: string) => content);
        chatService.loadMessages.and.resolveTo({message: []});

        localStorageService = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', [
            'getChatId',
            'setChatId',
            'getCategoryId',
            'setCategoryId',
            'flushCategoryId'
        ]);
        localStorageService.getChatId.and.returnValue(null);
        localStorageService.getCategoryId.and.returnValue(null);

        queryParamMap = convertToParamMap({});
    });

    afterEach(() => {
        fixture?.destroy();
    });

    it('passes validated launch context only when creating a new chat', async () => {
        queryParamMap = convertToParamMap({
            category_id: 'dps',
            stage_id: 'stop_reason',
            variant_id: 'dps_stop_reason_v83',
            context_contract_id: 'dps-context-v2',
            context: JSON.stringify({reason_explained: null, documents_requested: true})
        });
        chatService.startChat.and.resolveTo({
            chat: {id: 'chat-new'},
            answer: {
                content: 'Начальный ответ',
                next: [{
                    id: 'q_reason',
                    question: 'Причину остановки назвали?',
                    type: 'chips_yes_no',
                    answers: [
                        {key: 'yes', label: 'Да'},
                        {key: 'no', label: 'Нет'}
                    ]
                }]
            }
        });

        await createComponent();

        expect(chatService.startChat).toHaveBeenCalledOnceWith({
            category_id: 'dps',
            stage_id: 'stop_reason',
            variant_id: 'dps_stop_reason_v83',
            context_contract_id: 'dps-context-v2',
            context: {reason_explained: null, documents_requested: true}
        });
        expect(localStorageService.setChatId).toHaveBeenCalledOnceWith('chat-new');
        expect(localStorageService.setCategoryId).not.toHaveBeenCalled();
        expect(component.messages.some((message) => message.nextQuestion?.id === 'q_reason')).toBeTrue();
        expect(fixture.nativeElement.querySelector('app-typed-next-question')).not.toBeNull();
    });

    it('reloads the server-side chat without replaying launch context', async () => {
        queryParamMap = convertToParamMap({
            category_id: 'dps',
            context_contract_id: 'dps-context-v2',
            context: JSON.stringify({reason_explained: true})
        });
        localStorageService.getChatId.and.returnValue('chat-existing');

        await createComponent();

        expect(chatService.loadMessages).toHaveBeenCalledOnceWith('chat-existing');
        expect(chatService.startChat).not.toHaveBeenCalled();
        expect(localStorageService.setChatId).not.toHaveBeenCalled();
        expect(localStorageService.setCategoryId).not.toHaveBeenCalled();
    });

    it('submits a typed answer without a client target or context state', async () => {
        localStorageService.getChatId.and.returnValue('chat-existing');
        chatService.sendTypedAnswer.and.returnValue(NEVER);
        await createComponent();
        component.messages = [{
            id: 'next-message',
            content: '',
            sender: 'ai',
            timestamp: new Date(),
            isTyping: false,
            displayContent: '',
            areViewsVisible: true,
            nextQuestion: {
                id: 'q_reason',
                question: 'Причину остановки назвали?',
                type: 'chips_yes_no',
                answers: [
                    {key: 'yes', label: 'Да'},
                    {key: 'no', label: 'Нет'}
                ]
            }
        }];

        component.onNextAnswer({question_id: 'q_reason', answer_key: 'yes'});

        expect(chatService.sendTypedAnswer).toHaveBeenCalledOnceWith('chat-existing', {
            question_id: 'q_reason',
            answer_key: 'yes'
        });
    });
});
