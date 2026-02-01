import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ApiInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Можно добавить заголовки, токены и т.д.
        const clonedRequest = req.clone({
            headers: req.headers.set('Content-Type', 'application/json')
        });

        return next.handle(clonedRequest).pipe(
            catchError((error: HttpErrorResponse) => {
                console.error('API Error:', error);
                return throwError(() => error);
            })
        );
    }
}
