import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { ErrorStateService } from '../services/error-state.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorState = inject(ErrorStateService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const backendMessage =
        typeof error.error === 'object' && error.error?.message
          ? String(error.error.message)
          : '';

      const message =
        backendMessage ||
        (error.status === 0
          ? 'Cannot connect to server. Please check your connection.'
          : `Request failed (${error.status}). Please try again.`);

      errorState.setMessage(message);
      return throwError(() => error);
    })
  );
};
