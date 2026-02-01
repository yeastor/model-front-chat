import { Component } from '@angular/core';

@Component({
    selector: 'app-typing-indicator',
    template: `
    <div class="typing-indicator">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
  `,
    styleUrls: ['./typing-indicator.component.scss']
})
export class TypingIndicatorComponent {}
