import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-loading-spinner',
    template: `
        <div class="loading-spinner" role="status">
            <span class="loading-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <span>{{ label }}</span>
        </div>
    `,
    styleUrls: ['./loading-spinner.component.scss']
})
export class LoadingSpinnerComponent {
    @Input() label = 'АЙзащита готовит ответ…';
}
