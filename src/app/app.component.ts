import {Component, ElementRef, OnInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {ChatListComponent} from './features/chat/components/chat-list/chat-list.component';
import {ChatListService} from './features/chat/services/chat-list.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, ChatListComponent],
    template: `
    <div class="app-container">
      @if (!embedded) {
      <header class="app-header">
        <h1>АЙзащита</h1>
      </header>
      }
        <div class="app-body">
            @if (showMenu) {
                <app-chat-list [showToggleButton]="showMenuToggle"></app-chat-list>
            }
            <main class="app-main">
                @if (error) {
                    <p class="app-error" role="alert">Не удалось открыть диалог. Вернитесь к списку своих чатов или обновите страницу.</p>
                } @else {
                <router-outlet></router-outlet>
                }
            </main>
        </div>
    </div>
  `,
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    embedded = window.parent !== window || new URLSearchParams(window.location.search).get('embedded') === '1';
    error = false;
    showMenu = true;
    showMenuToggle = true;

    constructor(elementRef: ElementRef<HTMLElement>, private chatListService: ChatListService) {
        const host = elementRef.nativeElement;
        this.showMenu = !this.embedded && host.getAttribute('show-menu') !== 'false';
        this.showMenuToggle = host.getAttribute('show-menu-toggle') !== 'false';
    }

    ngOnInit(): void {
        // The host serves its public MUI tokens; append after the bundled fallback theme.
        if (this.embedded) {
            const theme = document.createElement('link');
            theme.rel = 'stylesheet';
            theme.href = '/chat-app/theme.css';
            document.head.appendChild(theme);
        }
        void this.chatListService.init().catch(() => { this.error = true; });
    }
}
