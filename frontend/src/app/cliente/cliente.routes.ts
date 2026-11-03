
import { Routes } from '@angular/router';

export const CLIENTE_ROUTES: Routes = [
  {
    path: 'inicio',
    loadComponent: () =>
      import('./inicio/inicio-cliente')
        .then(m => m.InicioCliente)
  },
  {
    path: 'buscar-viajes',
    loadComponent: () =>
      import('./pages/buscar-viajes/buscar-viajes')
        .then(m => m.BuscarViajes)
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'inicio'
  }
];
