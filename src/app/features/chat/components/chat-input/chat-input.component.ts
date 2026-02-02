import { Component, Output, EventEmitter, Input } from '@angular/core';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatIcon} from "@angular/material/icon";

@Component({
    selector: 'app-chat-input',
    template: `
        <div class="input-container">
            <div class="input-wrapper">
                <input
                        matInput
                        [formControl]="messageControl"
                        placeholder="Введите сообщение..."
                        (keydown.enter)="onSubmit()"
                        [disabled]="disabled"
                        class="message-input"
                />
                <button
                        mat-raised-button
                        color="primary"
                        [disabled]="messageControl.invalid || disabled"
                        (click)="onSubmit()"
                        class="send-button"
                >
                    <mat-icon>send</mat-icon>
                </button>
            </div>
        </div>
    `,
    imports: [
        ReactiveFormsModule,
        MatIcon
    ],
    styleUrls: ['./chat-input.component.scss']
})
export class ChatInputComponent {
    @Output() sendMessage = new EventEmitter<string>();
    @Input() disabled = false;

    messageControl = new FormControl('', [
        Validators.required,
        Validators.minLength(1),
        Validators.maxLength(2000)
    ]);

    onSubmit(): void {
        if (this.messageControl.valid && !this.disabled) {
            const message = this.messageControl.value?.trim();
            if (message) {
                this.sendMessage.emit(message);
                this.messageControl.reset();
            }
        }
    }
}
