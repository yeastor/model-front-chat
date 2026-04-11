import {Component, EventEmitter, Input, Output} from '@angular/core';
import {ChatViewDto} from '../../models/chat.model';

@Component({
    selector: 'app-message-badges',
    template: `
        <div class="message-badges">
            @for (view of views; track trackView(view, $index)) {
                @if (view.type === 'badge') {
                    <button
                            type="button"
                            class="message-badge"
                            [disabled]="disabled"
                            (click)="onBadgeClick(view)"
                    >
                        {{ view.value }}
                    </button>
                }
            }
        </div>
    `,
    styleUrls: ['./message-badges.component.scss']
})
export class MessageBadgesComponent {
    @Input() views: ChatViewDto[] = [];
    @Input() disabled = false;
    @Output() badgeClick = new EventEmitter<ChatViewDto>();

    onBadgeClick(view: ChatViewDto): void {
        this.badgeClick.emit(view);
    }

    trackView(view: ChatViewDto, index: number): string {
        return `${view.type}-${view.id}-${index}`;
    }
}
