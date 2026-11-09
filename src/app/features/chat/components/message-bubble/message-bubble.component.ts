import { Component, Input, OnChanges } from '@angular/core';
import { ChatMessage } from '../../models/chat.model';
import { TypingIndicatorComponent } from '../typing-indicator/typing-indicator.component';
import { AnswerIconComponent } from '../answer-icon/answer-icon.component';
import { AnswerSection, presentAnswer } from './answer-presentation';

@Component({
    selector: 'app-message-bubble',
    template: `
        <div [class]="getBubbleClasses()">
            @if (!isTyping) {
                @if (message.sender === 'ai' && message.isQuestion) {
                    <h3 class="answer-question">
                        <app-answer-icon name="question" />
                        <span [innerHTML]="displayContent"></span>
                    </h3>
                } @else if (answerSections.length) {
                    <div class="answer-sections">
                        @for (section of answerSections; track $index) {
                            <section class="answer-section" [class.answer-section--danger]="section.kind === 'dont'" [attr.data-section]="section.kind">
                                <h3 class="answer-heading">
                                    <app-answer-icon [name]="section.icon" />
                                    <span>{{ section.title }}</span>
                                </h3>
                                <ul class="answer-items">
                                    @for (item of section.items; track $index) {
                                        <li class="answer-item" [class.answer-item--linked]="!!item.href">
                                            @if (item.href) {
                                                <a class="answer-link-row" [class.answer-document]="section.kind === 'documents'" [href]="item.href" target="_top">
                                                    @if (section.kind !== 'documents') { <app-answer-icon [name]="section.itemIcon" /> }
                                                    <div class="answer-link-text" [innerHTML]="item.html"></div>
                                                    @if (section.kind === 'documents') { <app-answer-icon name="chevron_forward" /> }
                                                </a>
                                            } @else {
                                                <app-answer-icon [name]="section.itemIcon" />
                                                <div class="answer-item-text" [innerHTML]="item.html"></div>
                                            }
                                        </li>
                                    }
                                </ul>
                            </section>
                        }
                    </div>
                } @else {
                    <div class="message-content" [innerHTML]="displayContent"></div>
                }
            } @else {
                <app-typing-indicator></app-typing-indicator>
            }
        </div>
    `,
    imports: [TypingIndicatorComponent, AnswerIconComponent],
    styleUrls: ['./message-bubble.component.scss']
})
export class MessageBubbleComponent implements OnChanges {
    @Input() message!: ChatMessage;
    @Input() isTyping = false;
    @Input() displayContent = '';
    answerSections: AnswerSection[] = [];

    ngOnChanges(): void {
        this.answerSections = this.message?.sender === 'ai' && !this.message.isQuestion
            ? presentAnswer(this.displayContent) : [];
    }

    getBubbleClasses(): string {
        return 'message-bubble ' + (this.message.sender === 'user' ? 'user-message' : 'ai-message');
    }
}
