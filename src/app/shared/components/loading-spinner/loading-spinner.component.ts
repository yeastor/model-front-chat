import { Component } from '@angular/core';
import {MatProgressSpinner} from "@angular/material/progress-spinner";

@Component({
    selector: 'app-loading-spinner',
    template: `
        <div class="loading-spinner">
            <mat-spinner diameter="40"></mat-spinner>
        </div>
    `,
    imports: [
        MatProgressSpinner
    ],
    styleUrls: ['./loading-spinner.component.scss']
})
export class LoadingSpinnerComponent {}
