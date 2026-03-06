import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

const SKIP_PATHS = ['/auth/login', '/auth/refresh'];

export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isApiRequest = req.url.startsWith(environment.apiUrl);

      if (!isApiRequest || error.status !== 401 || SKIP_PATHS.some((path) => req.url.includes(path))) {
        return throwError(() => error);
      }

      return authService.refresh().pipe(
        switchMap((token) => {
          if (!token) {
            void router.navigate(['/auth/login']);
            return throwError(() => error);
          }

          const retried = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token.accessToken}`
            }
          });

          return next(retried);
        }),
        catchError(() => {
          void router.navigate(['/auth/login']);
          return throwError(() => error);
        })
      );
    })
  );
};
