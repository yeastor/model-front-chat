import { Component, Output, EventEmitter, Input, ViewChild, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { AbstractControl, FormControl, ReactiveFormsModule, Validators, ValidationErrors } from '@angular/forms';
import { CdkTextareaAutosize, TextFieldModule } from '@angular/cdk/text-field';

@Component({
    selector: 'app-chat-input',
    template: `
        <div class="input-wrapper">
            <textarea
                cdkTextareaAutosize cdkAutosizeMinRows="1" [cdkAutosizeMaxRows]="maxRows"
                [formControl]="messageControl"
                placeholder="Уточните: что происходит сейчас? (например: просят выйти, досмотр, документы)"
                aria-label="Сообщение для АЙзащиты"
                [attr.aria-describedby]="messageLength > 9000 ? 'chat-input-notice message-count' : 'chat-input-notice'"
                [attr.aria-invalid]="messageLength > messageLimit"
                (keydown)="onKeydown($event)"
                [readOnly]="disabled"
                [attr.aria-disabled]="disabled"
                class="message-input"
                rows="1"
            ></textarea>
            <div class="input-toolbar">
                <div class="input-tools">
                    <button type="button" class="tool-button" aria-label="Скачать чат в PDF" title="Скачать чат в PDF"
                        [disabled]="!canExport || exportBusy" (click)="downloadChat.emit()">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <button type="button" class="tool-button" aria-label="Поделиться PDF чата" title="Поделиться PDF чата"
                        [disabled]="!canExport || exportBusy" (click)="shareChat.emit()">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 11 8-5m-8 7 8 5" stroke="currentColor" stroke-width="1.8"/><circle cx="5" cy="12" r="3" fill="currentColor"/><circle cx="18" cy="5" r="3" fill="currentColor"/><circle cx="18" cy="19" r="3" fill="currentColor"/></svg>
                    </button>
                </div>
                <button type="button" [disabled]="!canSend" (click)="onSubmit()"
                class="send-button" aria-label="Отправить сообщение" title="Отправить сообщение">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                </button>
            </div>
        </div>
        @if (messageLength > 9000) {
            <div class="input-caption" id="message-count">
                <span class="input-counter" [class.input-counter--error]="messageControl.invalid">
                    {{ messageLength }}/{{ messageLimit }}
                </span>
            </div>
        }
    `,
    imports: [ReactiveFormsModule, TextFieldModule],
    styleUrls: ['./chat-input.component.scss']
})
export class ChatInputComponent implements OnInit, OnDestroy {
    @Output() sendMessage = new EventEmitter<string>();
    @Output() downloadChat = new EventEmitter<void>();
    @Output() shareChat = new EventEmitter<void>();
    @Input() disabled = false;
    @Input() canExport = false;
    @Input() exportBusy = false;
    @ViewChild(CdkTextareaAutosize) autosize?: CdkTextareaAutosize;

    readonly messageLimit = 10000;
    maxRows = 5;
    messageControl = new FormControl('', [Validators.required, (control: AbstractControl): ValidationErrors | null => {
        const actualLength = Array.from(String(control.value ?? '')).length;
        return actualLength > this.messageLimit ? { maxlength: { requiredLength: this.messageLimit, actualLength } } : null;
    }]);

    constructor(private cdr: ChangeDetectorRef) {}

    get messageLength(): number { return Array.from(this.messageControl.value ?? '').length; }

    private updateSize = (): void => {
        const height = Math.min(window.innerHeight, window.visualViewport?.height ?? window.innerHeight);
        const rowCap = window.innerWidth <= 480 ? 6 : 10;
        this.maxRows = Math.max(2, Math.min(rowCap, Math.floor(height * 0.3 / 24)));
        this.cdr.detectChanges();
        this.autosize?.resizeToFitContent(true);
    };

    ngOnInit(): void {
        const height = Math.min(window.innerHeight, window.visualViewport?.height ?? window.innerHeight);
        this.maxRows = Math.max(2, Math.min(window.innerWidth <= 480 ? 6 : 10, Math.floor(height * 0.3 / 24)));
        window.addEventListener('resize', this.updateSize);
        window.visualViewport?.addEventListener('resize', this.updateSize);
    }

    ngOnDestroy(): void {
        window.removeEventListener('resize', this.updateSize);
        window.visualViewport?.removeEventListener('resize', this.updateSize);
    }

    get canSend(): boolean {
        return !this.disabled && this.messageControl.valid && !!this.messageControl.value?.trim();
    }

    onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
            event.preventDefault();
            this.onSubmit();
        }
    }

    onSubmit(): void {
        if (!this.canSend) return;
        this.sendMessage.emit(this.messageControl.value!.trim());
        this.messageControl.reset('');
        this.autosize?.reset();
    }
}
