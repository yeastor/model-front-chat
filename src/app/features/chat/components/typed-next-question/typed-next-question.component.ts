import {Component, EventEmitter, Input, Output} from '@angular/core';

import {
    ChatAnswerKey,
    ChatAnswerSelectionDto,
    ChatNextQuestionDto
} from '../../models/chat.model';

@Component({
    selector: 'app-typed-next-question',
    template: `
        <div class="typed-next-question" role="group" [attr.aria-label]="question.question">
            <p class="typed-next-question__text">{{ question.question }}</p>
            <div class="typed-next-question__answers">
                @for (answer of question.answers; track answer.key) {
                    <button
                            type="button"
                            class="typed-next-question__answer"
                            [disabled]="disabled"
                            (click)="onAnswerClick(answer.key)"
                    >
                        {{ answer.label }}
                    </button>
                }
            </div>
        </div>
    `,
    styleUrls: ['./typed-next-question.component.scss']
})
export class TypedNextQuestionComponent {
    @Input({required: true}) question!: ChatNextQuestionDto;
    @Input() disabled = false;
    @Output() answerClick = new EventEmitter<ChatAnswerSelectionDto>();

    onAnswerClick(answerKey: ChatAnswerKey): void {
        this.answerClick.emit({
            question_id: this.question.id,
            answer_key: answerKey
        });
    }
}
