
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
    path: 'historial',
    loadComponent: () =>
      import('./pages/historial-compras/historial-compras')
        .then(m => m.HistorialCompras)
  },
  {
  path: 'boletos',
  loadComponent: () =>
    import('./pages/mis-boletos/mis-boletos')
      .then(m => m.MisBoletos)
  },
  {
    path: 'notificaciones',
    loadComponent: () =>
      import('./pages/notificaciones/notificaciones')
        .then(m => m.NotificacionesCliente)
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'inicio'
  }
];
