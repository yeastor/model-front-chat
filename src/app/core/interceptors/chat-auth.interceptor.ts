import {HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';
import {catchError, throwError} from 'rxjs';
import {environment} from '../../../environments/environment';

export const chatAuthInterceptor: HttpInterceptorFn = (request, next) => {
    return next(request).pipe(catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && request.url.startsWith(`${environment.apiUrl}/`)) {
            if (window.parent !== window) {
                window.parent.postMessage({type: 'aizaschita:auth-required'}, window.location.origin);
            } else {
                window.location.assign(environment.loginUrl);
            }
        }
        return throwError(() => error);
    }));
};
