import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';

import {ChatAnswerSelectionDto, ChatLaunchParams} from '../models/chat.model';
import {ChatService} from './chat.service';

describe('ChatService', () => {
    let service: ChatService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ChatService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(ChatService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
    });

    it('sends launch context only when starting a new chat', async () => {
        const launch: ChatLaunchParams = {
            category_id: 'dps',
            stage_id: 'stop_reason',
            variant_id: 'dps_stop_reason_v83',
            context_contract_id: 'dps-context-v2',
            context: {reason_explained: null}
        };
        const responsePromise = service.startChat(launch);
        const request = http.expectOne('/model/chat/start/start');

        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({launch});
        request.flush({chat: {id: 'chat-new'}});

        expect((await responsePromise).chat.id).toBe('chat-new');
    });

    it('keeps an absent launch backward compatible', async () => {
        const responsePromise = service.startChat();
        const request = http.expectOne('/model/chat/start/start');

        expect(request.request.body).toEqual({});
        request.flush({chat: {id: 'chat-empty'}});

        expect((await responsePromise).chat.id).toBe('chat-empty');
    });

    it('submits only question_id and answer_key for a typed answer', () => {
        const unsafeSelection = {
            question_id: 'q_dps_stop_reason_reason_explained',
            answer_key: 'yes',
            field_id: 'reason_explained',
            set_context_value: true,
            go_to_variant: 'dps_stop_reason_v99',
            context: {reason_explained: true}
        } as ChatAnswerSelectionDto & Record<string, unknown>;

        service.sendTypedAnswer('chat-1', unsafeSelection).subscribe();
        const request = http.expectOne('/model/chat/next/answer');

        expect(request.request.body).toEqual({
            chat: {id: 'chat-1'},
            answer: {
                question_id: 'q_dps_stop_reason_reason_explained',
                answer_key: 'yes'
            }
        });
        request.flush({answer: {content: 'Ответ', next: []}});
    });

    it('keeps an ordinary chat question on the existing request shape', () => {
        service.sendMessage('chat-1', 'Что делать?', 'dps').subscribe();
        const request = http.expectOne('/model/chat/chat');

        expect(request.request.body).toEqual({
            chat: {id: 'chat-1'},
            question: {
                q: 'Что делать?',
                category: {id: 'dps'}
            }
        });
        request.flush({answer: {content: 'Ответ', next: []}});
    });
});
