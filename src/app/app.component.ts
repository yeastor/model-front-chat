import {Component, ElementRef} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {ChatListComponent} from './features/chat/components/chat-list/chat-list.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, ChatListComponent],
    template: `
    <div class="app-container">
      <header class="app-header">
        <h1>АЙзащита</h1>
      </header>
        <div class="app-body">
            @if (showMenu) {
                <app-chat-list [showToggleButton]="showMenuToggle"></app-chat-list>
            }
            <main class="app-main">
                <router-outlet></router-outlet>
            </main>
        </div>
    </div>
  `,
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    showMenu = true;
    showMenuToggle = true;

    constructor(elementRef: ElementRef<HTMLElement>) {
        const host = elementRef.nativeElement;
        this.showMenu = host.getAttribute('show-menu') !== 'false';
        this.showMenuToggle = host.getAttribute('show-menu-toggle') !== 'false';
    }
}
