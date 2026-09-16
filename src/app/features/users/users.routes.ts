import { Routes } from '@angular/router';

export const usersRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./users-management/users-management').then((m) => m.UsersManagement),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./users-management/users-management').then((m) => m.UsersManagement),
  },
];
