import { Routes } from '@angular/router';

export const usersRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./users-list/users-list').then((m) => m.UsersList),
  },
  {
    path: 'new',
    loadComponent: () => import('./users-create/users-create').then((m) => m.UsersCreate),
  },
  {
    path: 'update',
    loadComponent: () => import('./users-update/users-update').then((m) => m.UsersUpdate),
  },
  {
    path: 'delete',
    loadComponent: () => import('./users-delete/users-delete').then((m) => m.UsersDelete),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./users-edit/users-edit').then((m) => m.UsersEdit),
  },
];
