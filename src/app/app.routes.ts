import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth/login'
  },
  {
    path: 'auth',
    loadChildren: () => import('./pages/public/public.routes').then((m) => m.PUBLIC_ROUTES)
  },
  {
    path: 'app',
    loadChildren: () => import('./pages/private/private.routes').then((m) => m.PRIVATE_ROUTES)
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
