import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

/**
 * Global 401 handler: an expired/invalid access token means the session is
 * dead, so we clear it and bounce to /login instead of leaving the caller
 * to fail silently. Token *refresh* is deliberately not attempted here —
 * keep this interceptor simple; add refresh-on-401 once the flow is proven.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        authService.logout();
      }
      return throwError(() => error);
    }),
  );
};
