import {
  CommonModule
} from '@angular/common';

import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import {
  AuthService
} from '../../services/auth.service';


interface MenuItem {
  texto: string;
  icono: string;
  ruta?: string;
}


@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout {

  private readonly authService =
    inject(AuthService);


  readonly menuAbierto =
    signal(false);


  readonly usuario =
    this.authService.usuarioActual;


  readonly subtituloPanel =
    computed(() => {

      switch (
        this.usuario()?.rol
      ) {

        case 'ADMIN':

          return 'Administración';


        case 'COOPERATIVA':

          return 'Gestión de Cooperativa';


        case 'OFICINISTA':

          return 'Punto de Venta';


        case 'CLIENTE':

          return 'Portal del Cliente';


        case 'BUS':

          return 'Operación de Bus';


        default:

          return 'Panel de gestión';

      }

    });


  readonly menuItems =
    computed<MenuItem[]>(() => {

      switch (
        this.usuario()?.rol
      ) {

        /*
         * =====================================================
         * ADMIN
         * =====================================================
         */

        case 'ADMIN':

          return [

            {
              texto: 'Inicio',
              icono: 'bi-grid',
              ruta: '/admin/inicio'
            },

            {
              texto: 'Usuarios',
              icono: 'bi-people',
              ruta: '/admin/usuarios'
            },

            {
              texto: 'Cooperativas',
              icono: 'bi-building',
              ruta: '/admin/cooperativas'
            },

            {
              texto: 'Roles',
              icono: 'bi-person-gear',
              ruta: '/admin/roles'
            }

          ];


        /*
         * =====================================================
         * COOPERATIVA
         * =====================================================
         */

        case 'COOPERATIVA':

          return [

            {
              texto: 'Inicio',
              icono: 'bi-grid',
              ruta:
                '/cooperativas/inicio'
            },

            {
              texto: 'Mi cooperativa',
              icono: 'bi-building-gear',
              ruta:
                '/cooperativas/configuracion'
            },

            {
              texto: 'Buses',
              icono: 'bi-bus-front',
              ruta:
                '/cooperativas/buses'
            },

            {
              texto: 'Grupos',
              icono: 'bi-collection',
              ruta:
                '/cooperativas/grupos'
            },

            {
              texto: 'Plantillas',
              icono: 'bi-grid-3x3-gap',
              ruta:
                '/cooperativas/plantillas'
            },
            {
              texto: 'Tipos de asiento',
              icono: 'bi-tags',
              ruta: '/cooperativas/tipos-asiento'
            },

            {
              texto: 'Lugares',
              icono: 'bi-geo-alt',
              ruta:
                '/cooperativas/lugares'
            },

            {
              texto: 'Rutas',
              icono: 'bi-signpost-2',
              ruta:
                '/cooperativas/rutas'
            },

            {
              texto: 'Paradas',
              icono: 'bi-pin-map',
              ruta:
                '/cooperativas/paradas'
            },

            {
              texto: 'Mapa de lugares',
              icono: 'bi-map',
              ruta:
                '/cooperativas/mapas/lugares'
            },

            {
              texto:
                'Mapa de rutas y paradas',
              icono:
                'bi-signpost-split',
              ruta:
                '/cooperativas/mapas/rutas'
            },

            {
              texto: 'Resoluciones ANT',
              icono:
                'bi-file-earmark-text',
              ruta:
                '/cooperativas/resoluciones-ant'
            },

            {
              texto: 'Frecuencias',
              icono: 'bi-clock',
              ruta:
                '/cooperativas/frecuencias'
            },

            {
              texto: 'Tarifas',
              icono: 'bi-cash-coin',
              ruta:
                '/cooperativas/tarifas'
            },

            {
              texto: 'Hojas de Ruta',
              icono: 'bi-calendar-check',
              ruta:
                '/viajes/hojas-ruta'
            },

            {
              texto: 'Viajes',
              icono: 'bi-bus-front-fill',
              ruta:
                '/viajes/lista'
            }

          ];


        /*
         * =====================================================
         * OFICINISTA
         * =====================================================
         */

        case 'OFICINISTA':

          return [

            {
              texto: 'Inicio',
              icono: 'bi-grid',
              ruta:
                '/ventas/inicio'
            },

            {
              texto: 'Disponibilidad',
              icono: 'bi-search',
              ruta:
                '/ventas/disponibilidad'
            },

            {
              texto: 'Venta de boletos',
              icono:
                'bi-ticket-perforated',
              ruta:
                '/ventas/gestion'
            }

          ];


        /*
         * =====================================================
         * CLIENTE
         * =====================================================
         */

        case 'CLIENTE':

          return [

            {
              texto: 'Inicio',
              icono: 'bi-house',
              ruta:
                '/cliente/inicio'
            },

            {
              texto: 'Buscar viajes',
              icono: 'bi-search',
              ruta:
                '/cliente/buscar-viajes'
            },

            {
              texto: 'Mis boletos',
              icono:
                'bi-ticket-perforated',
              ruta:
                '/cliente/boletos'
            },

            {
              texto: 'Mis viajes',
              icono:
                'bi-clock-history',
              ruta:
                '/cliente/historial'
            },

            {
              texto: 'Notificaciones',
              icono: 'bi-bell',
              ruta:
                '/cliente/notificaciones'
            }

          ];


        /*
         * =====================================================
         * BUS
         * =====================================================
         */

        case 'BUS':

          return [

            {
              texto: 'Inicio',
              icono: 'bi-grid',
              ruta:
                '/personal-bus/inicio'
            },

            {
              texto:
                'Validar boletos',
              icono:
                'bi-qr-code-scan'
            },

            {
              texto: 'Viajes',
              icono: 'bi-map'
            },

            {
              texto: 'Historial',
              icono:
                'bi-clock-history'
            }

          ];


        default:

          return [];

      }

    });


  toggleMenu(): void {

    this.menuAbierto.update(
      valor => !valor
    );

  }


  cerrarMenu(): void {

    this.menuAbierto.set(
      false
    );

  }


  cerrarSesion(): void {

    this.authService.logout();

  }

}