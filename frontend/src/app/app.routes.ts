import { Routes } from '@angular/router';

import {
  authGuard
} from './guards/auth.guard';

import {
  roleGuard
} from './guards/role.guard';

import {
  Layout
} from './shared/layout/layout';

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
          import(
            './admin/inicio/inicio-admin'
          )
            .then(
              m => m.InicioAdmin
            )
      },

      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'inicio'
      }

    ]
  },

  {
    path: 'cooperativas',

    component: Layout,

    canActivate: [
      authGuard,
      roleGuard
    ],

    data: {
      roles: ['COOPERATIVA']
    },

    children: [

      {
        path: 'inicio',

        loadComponent: () =>
          import(
            './cooperativas/inicio/inicio-cooperativa'
          )
            .then(
              m => m.InicioCooperativa
            )
      },

      {
        path: 'buses',

        loadComponent: () =>
          import(
            './cooperativas/buses/buses-lista'
          )
            .then(
              m => m.BusesLista
            )
      },

      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'inicio'
      }

    ]
  },

  {
    path: 'ventas',

    component: Layout,

    canActivate: [
      authGuard,
      roleGuard
    ],

    data: {
      roles: ['OFICINISTA']
    },

    children: [

      {
        path: 'inicio',

        loadComponent: () =>
          import(
            './ventas/inicio/inicio-oficinista'
          )
            .then(
              m => m.InicioOficinista
            )
      },

      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'inicio'
      }

    ]
  },

  {
    path: 'cliente',

    component: Layout,

    canActivate: [
      authGuard,
      roleGuard
    ],

    data: {
      roles: ['CLIENTE']
    },

    children: [

      {
        path: 'inicio',

        loadComponent: () =>
          import(
            './cliente/inicio/inicio-cliente'
          )
            .then(
              m => m.InicioCliente
            )
      },

      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'inicio'
      }

    ]
  },

  {
    path: 'personal-bus',

    component: Layout,

    canActivate: [
      authGuard,
      roleGuard
    ],

    data: {
      roles: ['BUS']
    },

    children: [

      {
        path: 'inicio',

        loadComponent: () =>
          import(
            './personal-bus/inicio/inicio-personal-bus'
          )
            .then(
              m => m.InicioPersonalBus
            )
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