import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Material Modules
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AppComponent } from './app.component';
import { ChatComponent } from './features/chat/chat.component';
import { ChatInputComponent } from './features/chat/components/chat-input/chat-input.component';
import { MessageBubbleComponent } from './features/chat/components/message-bubble/message-bubble.component';
import { TypingIndicatorComponent } from './features/chat/components/typing-indicator/typing-indicator.component';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component';
import { SafeHtmlPipe } from './shared/pipes/safe-html.pipe';
import { ApiInterceptor } from './core/interceptors/api.interceptor';

@NgModule({
    declarations: [
        AppComponent,
        ChatComponent,
        ChatInputComponent,
        MessageBubbleComponent,
        TypingIndicatorComponent,
        LoadingSpinnerComponent,
        SafeHtmlPipe
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        HttpClientModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule.forRoot([
            { path: '', component: ChatComponent },
            { path: '**', redirectTo: '' }
        ]),

        // Material
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatProgressSpinnerModule
    ],
    providers: [
        { provide: HTTP_INTERCEPTORS, useClass: ApiInterceptor, multi: true }
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
