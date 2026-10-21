import { CommonModule } from '@angular/common';

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

import { AuthService } from '../../services/auth.service';

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

  readonly subtituloPanel = computed(() => {

    switch (this.usuario()?.rol) {

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

      switch (this.usuario()?.rol) {

        case 'ADMIN':
          return [
            {
              texto: 'Inicio',
              icono: 'bi-grid',
              ruta: '/admin/inicio'
            },
            {
              texto: 'Usuarios',
              icono: 'bi-people'
            },
            {
              texto: 'Cooperativas',
              icono: 'bi-building'
            },
            {
              texto: 'Roles',
              icono: 'bi-person-gear'
            },
            {
              texto: 'Configuración',
              icono: 'bi-gear'
            }
          ];

        case 'COOPERATIVA':
          return [
            {
              texto: 'Inicio',
              icono: 'bi-grid',
              ruta: '/cooperativas/inicio'
            },
            {
              texto: 'Buses',
              icono: 'bi-bus-front',
              ruta: '/cooperativas/buses'
            },
            {
              texto: 'Plantillas',
              icono: 'bi-grid-3x3-gap'
            },
            {
              texto: 'Rutas',
              icono: 'bi-signpost-2'
            },
            {
              texto: 'Frecuencias',
              icono: 'bi-clock'
            }
          ];

        case 'OFICINISTA':
          return [
            {
              texto: 'Inicio',
              icono: 'bi-grid',
              ruta: '/ventas/inicio'
            },
            {
              texto: 'Venta de boletos',
              icono: 'bi-ticket-perforated'
            },
            {
              texto: 'Validación',
              icono: 'bi-check-circle'
            },
            {
              texto: 'Pagos',
              icono: 'bi-credit-card'
            },
            {
              texto: 'Comprobantes',
              icono: 'bi-receipt'
            }
          ];

        case 'CLIENTE':
          return [
            {
              texto: 'Inicio',
              icono: 'bi-house',
              ruta: '/cliente/inicio'
            },
            {
              texto: 'Buscar viajes',
              icono: 'bi-search'
            },
            {
              texto: 'Mis boletos',
              icono: 'bi-ticket-perforated'
            },
            {
              texto: 'Mis viajes',
              icono: 'bi-clock-history'
            },
            {
              texto: 'Notificaciones',
              icono: 'bi-bell'
            }
          ];

        case 'BUS':
          return [
            {
              texto: 'Inicio',
              icono: 'bi-grid',
              ruta: '/personal-bus/inicio'
            },
            {
              texto: 'Validar boletos',
              icono: 'bi-qr-code-scan'
            },
            {
              texto: 'Viajes',
              icono: 'bi-map'
            },
            {
              texto: 'Historial',
              icono: 'bi-clock-history'
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
    this.menuAbierto.set(false);
  }

  cerrarSesion(): void {
    this.authService.logout();
  }
}