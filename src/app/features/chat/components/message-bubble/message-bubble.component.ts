import { Component, Input } from '@angular/core';
import { ChatMessage } from '../models/chat.model';

@Component({
    selector: 'app-message-bubble',
    template: `
    <div [class]="getBubbleClasses()">
      <div class="message-content" *ngIf="!isTyping">
        <div [innerHTML]="displayContent || message.content | safeHtml"></div>
      </div>
      <app-typing-indicator *ngIf="isTyping"></app-typing-indicator>
      <div class="message-time">{{ getFormattedTime() }}</div>
    </div>
  `,
    styleUrls: ['./message-bubble.component.scss']
})
export class MessageBubbleComponent {
    @Input() message!: ChatMessage;
    @Input() isTyping = false;
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
