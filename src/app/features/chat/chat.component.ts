import {Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef} from '@angular/core';
import { ChatService } from './services/chat.service';
import { ChatMessage } from './models/chat.model';
import { Subscription } from 'rxjs';
import {MessageBubbleComponent} from "./components/message-bubble/message-bubble.component";
import {LoadingSpinnerComponent} from "../../shared/components/loading-spinner/loading-spinner.component";
import {ChatInputComponent} from "./components/chat-input/chat-input.component";
import {NgForOf} from "@angular/common";

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    imports: [
        MessageBubbleComponent,
        LoadingSpinnerComponent,
        ChatInputComponent,
    ],
    styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

    messages: ChatMessage[] = [];
    isLoading = false;
    private subscriptions = new Subscription();

    constructor(private chatService: ChatService, private cdr: ChangeDetectorRef) {}

    ngOnInit(): void {
        // Initial welcome message
        this.addMessage({
            id: this.generateId(),
            content: 'Привет! Я ваш AI помощник. Чем могу помочь?',
            sender: 'ai',
            timestamp: new Date(),
            isTyping: false,
            displayContent: ''
        });
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    ngAfterViewChecked(): void {
        this.scrollToBottom();
    }

    onSendMessage(message: string): void {
        if (!message.trim()) return;

        // Add user message
        const userMessage: ChatMessage = {
            id: this.generateId(),
            content: message,
            sender: 'user',
            timestamp: new Date(),
            isTyping: false,
            displayContent: message
        };

        this.messages.push(userMessage);

        // Add typing indicator
        const typingMessage: ChatMessage = {
            id: this.generateId(),
            content: '',
            sender: 'ai',
            timestamp: new Date(),
            isTyping: true,
            displayContent: ''
        };
        this.messages.push(typingMessage);

        this.isLoading = true;

        const subscription = this.chatService.sendMessage(message).subscribe({
            next: (response) => {
                // Remove typing indicator
                this.messages.pop();

                const aiMessage: ChatMessage = {
                    id: this.generateId(),
                    content: response.answer.content,
                    sender: 'ai',
                    timestamp: new Date(),
                    isTyping: false,
                    displayContent: ''
                };

                this.isLoading = false;
                this.cdr.detectChanges();
                this.messages.push(aiMessage);

                // Start typing effect
                this.typeMessage(aiMessage);



            },
            error: (error) => {
                console.error('Error sending message:', error);
                this.messages.pop();
                this.addErrorMessage();
                this.isLoading = false;
            }
        });

        this.subscriptions.add(subscription);
    }

    private typeMessage(message: ChatMessage): void {
        const formattedContent: string = this.chatService.formatContent(message.content);
        let index : number = 0;
        const speed = 20; // скорость печати в мс

        const typeWriter = setInterval(() => {
            if (index < formattedContent.length) {
                message.displayContent += formattedContent.charAt(index);
                index++;
                this.cdr.detectChanges();
            } else {
                clearInterval(typeWriter);
            }
        }, speed);
    }

    private addErrorMessage(): void {
        const errorMessage: ChatMessage = {
            id: this.generateId(),
            content: 'Извините, произошла ошибка. Пожалуйста, попробуйте еще раз.',
            sender: 'ai',
            timestamp: new Date(),
            isTyping: false,
            displayContent: ''
        };
        this.messages.push(errorMessage);
        this.typeMessage(errorMessage);
    }

    private addMessage(message: ChatMessage): void {
        this.messages.push({
            ...message,
            displayContent: message.content
        });
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private scrollToBottom(): void {
        try {
            this.messagesContainer.nativeElement.scrollTop =
                this.messagesContainer.nativeElement.scrollHeight;
        } catch(err) { }
    }

}
