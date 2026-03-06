import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const roles = (route.data?.['roles'] as string[] | undefined) ?? [];

  if (roles.length === 0) {
    return true;
  }

  if (authService.hasRole(roles)) {
    return true;
  }

  return router.createUrlTree(['/app/dashboard']);
};
