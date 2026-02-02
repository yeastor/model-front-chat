import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet],
    template: `
    <div class="app-container">
      <header class="app-header">
        <h1>AI Chat Assistant</h1>
      </header>
      <main class="app-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
    styleUrls: ['./app.component.scss']
})
export class AppComponent {}
