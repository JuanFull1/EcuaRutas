import { CommonModule } from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { forkJoin } from 'rxjs';

import {
  AdminRol,
  AdminUsuario,
  CooperativaResumen
} from '../../models/admin-usuario.model';

import {
  UsuariosAdminService
} from '../../services/usuarios-admin.service';

@Component({
  selector: 'app-usuarios-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './usuarios-admin.html',
  styleUrl: './usuarios-admin.css'
})
export class UsuariosAdmin
  implements OnInit {

  private readonly servicio =
    inject(UsuariosAdminService);

  private readonly fb =
    inject(FormBuilder);

  private readonly cdr =
    inject(ChangeDetectorRef);

  usuarios: AdminUsuario[] = [];

  roles: AdminRol[] = [];

  cooperativas: CooperativaResumen[] = [];

  cargando = false;

  guardando = false;

  error = '';

  mensaje = '';

  mostrarFormulario = false;

  mostrarPassword = false;

  usuarioEditandoId:
    number | null = null;

  usuarioPassword:
    AdminUsuario | null = null;

  readonly filtros =
    this.fb.group({

      busqueda: [''],

      rolId: [''],

      estado: ['']

    });

  readonly formulario =
    this.fb.group({

      cedula: [
        '',
        Validators.maxLength(20)
      ],

      nombres: [
        '',
        [
          Validators.required,
          Validators.maxLength(120)
        ]
      ],

      apellidos: [
        '',
        [
          Validators.required,
          Validators.maxLength(120)
        ]
      ],

      correo: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(150)
        ]
      ],

      telefono: [
        '',
        Validators.maxLength(30)
      ],

      password: [''],

      rolId: [
        '',
        Validators.required
      ],

      cooperativaId: [''],

      activo: [true]

    });

  readonly formularioPassword =
    this.fb.group({

      nuevaPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(100)
        ]
      ],

      confirmarPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(100)
        ]
      ]

    });

  ngOnInit(): void {

    this.cargarInicial();

  }

  cargarInicial(): void {

    this.cargando = true;

    this.error = '';

    this.cdr.markForCheck();

    forkJoin({

      usuarios:
        this.servicio.listar(),

      roles:
        this.servicio.listarRoles(),

      cooperativas:
        this.servicio.listarCooperativas()

    })
      .subscribe({

        next: resultado => {

          this.usuarios =
            resultado.usuarios;

          this.roles =
            resultado.roles;

          this.cooperativas =
            resultado.cooperativas;

          this.cargando = false;

          this.cdr.markForCheck();

        },

        error: error => {

          this.cargando = false;

          this.error =
            this.obtenerMensajeError(
              error,
              'No se pudo cargar la administración de usuarios.'
            );

          this.cdr.markForCheck();

        }

      });

  }

  buscar(): void {

    const valores =
      this.filtros.getRawValue();

    const rolId =
      valores.rolId
        ? Number(valores.rolId)
        : null;

    let activo:
      boolean | null = null;

    if (
      valores.estado === 'activo'
    ) {

      activo = true;

    }

    if (
      valores.estado === 'inactivo'
    ) {

      activo = false;

    }

    this.cargando = true;

    this.error = '';

    this.cdr.markForCheck();

    this.servicio
      .listar(
        valores.busqueda ?? '',
        rolId,
        activo
      )
      .subscribe({

        next: usuarios => {

          this.usuarios =
            usuarios;

          this.cargando = false;

          this.cdr.markForCheck();

        },

        error: error => {

          this.cargando = false;

          this.error =
            this.obtenerMensajeError(
              error,
              'No se pudieron consultar los usuarios.'
            );

          this.cdr.markForCheck();

        }

      });

  }

  limpiarFiltros(): void {

    this.filtros.reset({

      busqueda: '',

      rolId: '',

      estado: ''

    });

    this.buscar();

  }

  abrirCrear(): void {

    this.limpiarMensajes();

    this.usuarioEditandoId =
      null;

    this.formulario.reset({

      cedula: '',

      nombres: '',

      apellidos: '',

      correo: '',

      telefono: '',

      password: '',

      rolId: '',

      cooperativaId: '',

      activo: true

    });

    this.mostrarFormulario =
      true;

    this.cdr.markForCheck();

  }

  abrirEditar(
    usuario: AdminUsuario
  ): void {

    this.limpiarMensajes();

    this.usuarioEditandoId =
      usuario.id;

    this.formulario.reset({

      cedula:
        usuario.cedula ?? '',

      nombres:
        usuario.nombres,

      apellidos:
        usuario.apellidos,

      correo:
        usuario.correo,

      telefono:
        usuario.telefono ?? '',

      password: '',

      rolId:
        usuario.rolId.toString(),

      cooperativaId:
        usuario.cooperativaId
          ?.toString() ?? '',

      activo:
        usuario.activo

    });

    this.mostrarFormulario =
      true;

    this.cdr.markForCheck();

  }

  cerrarFormulario(): void {

    this.mostrarFormulario =
      false;

    this.usuarioEditandoId =
      null;

    this.cdr.markForCheck();

  }

  guardar(): void {

    this.limpiarMensajes();

    if (
      this.formulario.invalid
    ) {

      this.formulario
        .markAllAsTouched();

      return;

    }

    const valores =
      this.formulario
        .getRawValue();

    if (
      this.usuarioEditandoId === null &&
      (
        !valores.password ||
        valores.password.length < 8
      )
    ) {

      this.error =
        'La contraseña debe tener al menos 8 caracteres.';

      this.cdr.markForCheck();

      return;

    }

    const rolId =
      Number(
        valores.rolId
      );

    const cooperativaId =
      valores.cooperativaId
        ? Number(
            valores.cooperativaId
          )
        : null;

    this.guardando = true;

    this.cdr.markForCheck();

    if (
      this.usuarioEditandoId === null
    ) {

      this.servicio
        .crear({

          cedula:
            this.textoOpcional(
              valores.cedula
            ),

          nombres:
            valores.nombres!
              .trim(),

          apellidos:
            valores.apellidos!
              .trim(),

          correo:
            valores.correo!
              .trim(),

          telefono:
            this.textoOpcional(
              valores.telefono
            ),

          password:
            valores.password!,

          rolId,

          cooperativaId,

          activo:
            valores.activo ?? true

        })
        .subscribe({

          next: () => {

            this.guardando =
              false;

            this.mostrarFormulario =
              false;

            this.mensaje =
              'Usuario creado correctamente.';

            this.cdr.markForCheck();

            this.buscar();

          },

          error: error => {

            this.guardando =
              false;

            this.error =
              this.obtenerMensajeError(
                error,
                'No se pudo crear el usuario.'
              );

            this.cdr.markForCheck();

          }

        });

      return;

    }

    this.servicio
      .actualizar(
        this.usuarioEditandoId,
        {

          cedula:
            this.textoOpcional(
              valores.cedula
            ),

          nombres:
            valores.nombres!
              .trim(),

          apellidos:
            valores.apellidos!
              .trim(),

          correo:
            valores.correo!
              .trim(),

          telefono:
            this.textoOpcional(
              valores.telefono
            ),

          rolId,

          cooperativaId

        }
      )
      .subscribe({

        next: () => {

          this.guardando =
            false;

          this.mostrarFormulario =
            false;

          this.usuarioEditandoId =
            null;

          this.mensaje =
            'Usuario actualizado correctamente.';

          this.cdr.markForCheck();

          this.buscar();

        },

        error: error => {

          this.guardando =
            false;

          this.error =
            this.obtenerMensajeError(
              error,
              'No se pudo actualizar el usuario.'
            );

          this.cdr.markForCheck();

        }

      });

  }

  cambiarEstado(
    usuario: AdminUsuario
  ): void {

    const nuevoEstado =
      !usuario.activo;

    const accion =
      nuevoEstado
        ? 'activar'
        : 'desactivar';

    const confirmar =
      window.confirm(
        `¿Deseas ${accion} a ${usuario.nombres} ${usuario.apellidos}?`
      );

    if (!confirmar) {

      return;

    }

    this.limpiarMensajes();

    this.servicio
      .cambiarEstado(
        usuario.id,
        nuevoEstado
      )
      .subscribe({

        next: respuesta => {

          this.mensaje =
            respuesta.message;

          this.cdr.markForCheck();

          this.buscar();

        },

        error: error => {

          this.error =
            this.obtenerMensajeError(
              error,
              `No se pudo ${accion} el usuario.`
            );

          this.cdr.markForCheck();

        }

      });

  }

  abrirRestablecerPassword(
    usuario: AdminUsuario
  ): void {

    this.limpiarMensajes();

    this.usuarioPassword =
      usuario;

    this.formularioPassword
      .reset({

        nuevaPassword: '',

        confirmarPassword: ''

      });

    this.mostrarPassword =
      true;

    this.cdr.markForCheck();

  }

  cerrarPassword(): void {

    this.mostrarPassword =
      false;

    this.usuarioPassword =
      null;

    this.cdr.markForCheck();

  }

  guardarPassword(): void {

    this.limpiarMensajes();

    if (
      !this.usuarioPassword ||
      this.formularioPassword.invalid
    ) {

      this.formularioPassword
        .markAllAsTouched();

      return;

    }

    const valores =
      this.formularioPassword
        .getRawValue();

    if (
      valores.nuevaPassword !==
      valores.confirmarPassword
    ) {

      this.error =
        'Las contraseñas no coinciden.';

      this.cdr.markForCheck();

      return;

    }

    this.guardando =
      true;

    this.cdr.markForCheck();

    this.servicio
      .restablecerPassword(
        this.usuarioPassword.id,
        {

          nuevaPassword:
            valores.nuevaPassword!,

          confirmarPassword:
            valores.confirmarPassword!

        }
      )
      .subscribe({

        next: respuesta => {

          this.guardando =
            false;

          this.mostrarPassword =
            false;

          this.usuarioPassword =
            null;

          this.mensaje =
            respuesta.message;

          this.cdr.markForCheck();

        },

        error: error => {

          this.guardando =
            false;

          this.error =
            this.obtenerMensajeError(
              error,
              'No se pudo restablecer la contraseña.'
            );

          this.cdr.markForCheck();

        }

      });

  }

  requiereCooperativa(): boolean {

    const rolId =
      Number(
        this.formulario
          .controls
          .rolId
          .value
      );

    const rol =
      this.roles.find(
        item =>
          item.id === rolId
      );

    return (
      rol?.codigo === 'COOPERATIVA' ||
      rol?.codigo === 'OFICINISTA' ||
      rol?.codigo === 'BUS'
    );

  }

  alCambiarRol(): void {

    if (
      !this.requiereCooperativa()
    ) {

      this.formulario
        .controls
        .cooperativaId
        .setValue('');

    }

    this.cdr.markForCheck();

  }

  private textoOpcional(
    valor:
      string |
      null |
      undefined
  ): string | null {

    const texto =
      valor?.trim();

    return texto
      ? texto
      : null;

  }

  private limpiarMensajes(): void {

    this.error = '';

    this.mensaje = '';

  }

  private obtenerMensajeError(
    error: any,
    mensajePredeterminado: string
  ): string {

    return (
      error?.error?.message ||
      mensajePredeterminado
    );

  }

}