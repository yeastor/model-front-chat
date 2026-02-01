import { Component } from '@angular/core';

@Component({
    selector: 'app-loading-spinner',
    template: `
    <div class="loading-spinner">
      <mat-spinner diameter="40"></mat-spinner>
    </div>
  `,
    styleUrls: ['./loading-spinner.component.scss']
})
export class LoadingSpinnerComponent {}
