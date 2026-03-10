import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { OwnerAuthService } from '../services/owner-auth.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(OwnerAuthService);
  const token = authService.getToken();

  if (!token || req.url.includes('/user-auth/')) {
    return next(req);
  }

  const cloned = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(cloned);
};

