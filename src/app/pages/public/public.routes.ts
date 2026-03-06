import { Routes } from '@angular/router';
import { PublicLayoutComponent } from '../../layouts/public-layout/public-layout.component';

export const PUBLIC_ROUTES: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login'
      },
      {
        path: 'login',
        loadComponent: () => import('./login/login.page').then((m) => m.LoginPage)
      }
    ]
  }
];
