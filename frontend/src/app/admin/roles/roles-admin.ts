import { CommonModule } from '@angular/common';

import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';

import {
  RouterLink
} from '@angular/router';

import {
  AdminRol
} from '../../models/admin-usuario.model';

import {
  UsuariosAdminService
} from '../../services/usuarios-admin.service';

@Component({
  selector: 'app-roles-admin',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './roles-admin.html',
  styleUrl: './roles-admin.css'
})
export class RolesAdmin
  implements OnInit {

  private readonly usuariosService =
    inject(UsuariosAdminService);

  readonly roles =
    signal<AdminRol[]>([]);

  readonly cargando =
    signal(true);

  readonly error =
    signal('');

  readonly totalUsuarios =
    computed(() =>
      this.roles()
        .reduce(
          (total, rol) =>
            total + rol.cantidadUsuarios,
          0
        )
    );

  ngOnInit(): void {

    this.cargarRoles();

  }

  cargarRoles(): void {

    this.cargando.set(true);

    this.error.set('');

    this.usuariosService
      .listarRoles()
      .subscribe({

        next: roles => {

          this.roles.set(
            roles
          );

          this.cargando.set(
            false
          );

        },

        error: error => {

          this.cargando.set(
            false
          );

          this.error.set(
            error?.error?.message ||
            'No se pudieron cargar los roles.'
          );

        }

      });

  }

  descripcionRol(
    codigo: string
  ): string {

    switch (codigo) {

      case 'ADMIN':

        return (
          'Gestiona usuarios, roles, ' +
          'cooperativas y configuración ' +
          'general del sistema.'
        );

      case 'COOPERATIVA':

        return (
          'Administra información de la ' +
          'cooperativa, buses, plantillas, ' +
          'rutas y frecuencias.'
        );

      case 'OFICINISTA':

        return (
          'Gestiona disponibilidad, venta ' +
          'de boletos, pagos y atención ' +
          'desde el punto de venta.'
        );

      case 'CLIENTE':

        return (
          'Consulta viajes, compra boletos ' +
          'y accede a su historial y ' +
          'notificaciones.'
        );

      case 'BUS':

        return (
          'Gestiona las operaciones del ' +
          'viaje, validación de boletos y ' +
          'control de pasajeros.'
        );

      default:

        return (
          'Rol registrado en el sistema.'
        );

    }

  }

  iconoRol(
    codigo: string
  ): string {

    switch (codigo) {

      case 'ADMIN':
        return 'bi-shield-lock';

      case 'COOPERATIVA':
        return 'bi-building';

      case 'OFICINISTA':
        return 'bi-person-workspace';

      case 'CLIENTE':
        return 'bi-person';

      case 'BUS':
        return 'bi-bus-front';

      default:
        return 'bi-person-badge';

    }

  }

}