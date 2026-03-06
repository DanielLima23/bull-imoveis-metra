import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

const buildLoginTree = (url: string) => {
  const router = inject(Router);
  return router.createUrlTree(['/auth/login'], { queryParams: { redirectTo: url } });
};

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  return authService.isAuthenticated() ? true : buildLoginTree(state.url);
};

export const authChildGuard: CanActivateChildFn = (route, state) => authGuard(route, state);
