import { Routes } from '@angular/router';

export const VENTAS_ROUTES: Routes = [

  {
    path: 'inicio',

    loadComponent: () =>
      import(
        './inicio/inicio-oficinista'
      )
        .then(
          m => m.InicioOficinista
        )
  },

  {
    path: 'disponibilidad',

    loadComponent: () =>
      import(
        './disponibilidad/disponibilidad'
      )
        .then(
          m => m.Disponibilidad
        )
  },

  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'inicio'
  }

];