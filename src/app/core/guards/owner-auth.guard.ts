import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { OwnerAuthService } from '../services/owner-auth.service';

export const ownerAuthGuard: CanActivateFn = () => {
  if (typeof window === 'undefined') {
    return true;
  }

  const authService = inject(OwnerAuthService);
  const router = inject(Router);

  return authService.isAuthenticated() ? true : router.createUrlTree(['/owner/login']);
};
