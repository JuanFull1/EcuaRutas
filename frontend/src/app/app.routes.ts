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
      import(
        './auth/login/login'
      )
        .then(
          m => m.Login
        )
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
        path: 'cooperativas',
        loadComponent: () =>
          import('./admin/cooperativas/cooperativas-admin')
            .then(m => m.CooperativasAdmin)
      },

      {
        path: 'lugares',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./admin/lugares/lugares-lista')
            .then(m => m.LugaresLista)
      },

      {
        path: 'rutas',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./admin/rutas/rutas-lista')
            .then(m => m.RutasLista)
      },

      {
        path: 'paradas',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./admin/paradas/paradas-lista')
            .then(m => m.ParadasLista)
      },

      {
        path: 'mapas/lugares',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./admin/mapas/lugares/lugares-mapa')
            .then(m => m.LugaresMapa)
      },

      {
        path: 'mapas/rutas',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./admin/mapas/rutas/rutas-mapa')
            .then(m => m.RutasMapa)
      },

      {
        path: 'resoluciones-ant',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./admin/resoluciones-ant/resoluciones-ant-lista')
            .then(m => m.ResolucionesAntLista)
      },

      {
        path: 'frecuencias',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./admin/frecuencias/frecuencias-lista')
            .then(m => m.FrecuenciasLista)
      },

      {
        path: 'tarifas',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./admin/tarifas-frecuencia/tarifas-frecuencia-lista')
            .then(m => m.TarifasFrecuenciaLista)
      },
      {
        path: 'usuarios',

        loadComponent: () =>
          import(
            './admin/usuarios/usuarios-admin'
          )
            .then(
              m => m.UsuariosAdmin
            )
      },

      {
        path: 'roles',

        loadComponent: () =>
          import(
            './admin/roles/roles-admin'
          )
            .then(
              m => m.RolesAdmin
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
        path: 'configuracion',

        loadComponent: () =>
          import(
            './cooperativas/configuracion/mi-cooperativa'
          )
            .then(
              m => m.MiCooperativa
            )
      },

      {
        path: 'buses/nuevo',

        loadComponent: () =>
          import(
            './cooperativas/buses/bus-formulario'
          )
            .then(
              m => m.BusFormulario
            )
      },

      {
        path: 'buses/:id/editar',

        loadComponent: () =>
          import(
            './cooperativas/buses/bus-formulario'
          )
            .then(
              m => m.BusFormulario
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
        path: 'grupos',

        loadComponent: () =>
          import(
            './cooperativas/grupos/grupos-lista'
          )
            .then(
              m => m.GruposLista
            )
      },

      {
        path: 'plantillas',

        loadComponent: () =>
          import(
            './cooperativas/plantillas/plantillas-lista'
          )
            .then(
              m => m.PlantillasLista
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
    path: 'viajes',

    component: Layout,

    canActivate: [
      authGuard,
      roleGuard
    ],

    data: {
      roles: [
        'ADMIN',
        'COOPERATIVA'
      ]
    },

    children: [

      {
        path: '',

        loadChildren: () =>
          import(
            './viajes/viajes.routes'
          )
            .then(
              m => m.VIAJES_ROUTES
            )
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
        path: '',

        loadChildren: () =>
          import(
            './ventas/ventas.routes'
          )
            .then(
              m => m.VENTAS_ROUTES
            )
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
        path: '',

        loadChildren: () =>
          import(
            './cliente/cliente.routes'
          )
            .then(
              m => m.CLIENTE_ROUTES
            )
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