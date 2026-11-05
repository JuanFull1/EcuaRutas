import { Routes } from '@angular/router';

export const VIAJES_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'hojas-ruta' },
  {
    path: 'hojas-ruta',
    loadComponent: () =>
      import('./pages/hojas-ruta-lista/hojas-ruta-lista').then(m => m.HojasRutaLista)
  },
  {
    path: 'hojas-ruta/nueva',
    loadComponent: () =>
      import('./pages/hoja-ruta-formulario/hoja-ruta-formulario').then(m => m.HojaRutaFormulario)
  },
  {
    path: 'hojas-ruta/:id',
    loadComponent: () =>
      import('./pages/hoja-ruta-detalle/hoja-ruta-detalle').then(m => m.HojaRutaDetalleVista)
  },
  {
    path: 'lista',
    loadComponent: () =>
      import('./pages/viajes-lista/viajes-lista').then(m => m.ViajesLista)
  }
];