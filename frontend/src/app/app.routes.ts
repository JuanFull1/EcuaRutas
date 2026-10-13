import { Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

import { Layout } from './shared/layout/layout';

export const routes: Routes = [

  {
    path: 'login',

    loadComponent: () =>
      import('./auth/login/login')
        .then(m => m.Login)
  },

  {
    path: 'admin',

    component: Layout,

    canActivate: [
      authGuard,
      roleGuard
    ],

    data: {
      roles: ['ADMIN']
    },

    children: [

      {
        path: 'inicio',

        loadComponent: () =>
          import('./admin/inicio/inicio-admin')
            .then(m => m.InicioAdmin)
      },

      {
        path: '',

        pathMatch: 'full',

        redirectTo: 'inicio'
      }

    ]
  },

  {
    path: '',

    pathMatch: 'full',

    redirectTo: 'login'
  },

  {
    path: '**',

    redirectTo: 'login'
  }

];