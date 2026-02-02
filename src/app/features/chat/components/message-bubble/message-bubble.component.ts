import {booleanAttribute, Component, Input} from '@angular/core';
import { ChatMessage } from '../../models/chat.model';
import {TypingIndicatorComponent} from "../typing-indicator/typing-indicator.component";

@Component({
    selector: 'app-message-bubble',
    template: `
        <div [class]="getBubbleClasses()">
            @if (!isTyping) {
                <div class="message-content" >
                    <div [innerHTML]="displayContent"></div>
                </div>
            } @else {
                <app-typing-indicator></app-typing-indicator>
            }
            <div class="message-time">{{ getFormattedTime() }}</div>
        </div>
    `,
    imports: [
        TypingIndicatorComponent
    ],
    styleUrls: ['./message-bubble.component.scss']
})
export class MessageBubbleComponent {
    @Input() message!: ChatMessage;
    @Input() isTyping: boolean = false;
    @Input() displayContent = '';

    getBubbleClasses(): string {
        const baseClass = 'message-bubble';
        return this.message.sender === 'user'
            ? `${baseClass} user-message`
            : `${baseClass} ai-message`;
    }

    getFormattedTime(): string {
        return this.message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
