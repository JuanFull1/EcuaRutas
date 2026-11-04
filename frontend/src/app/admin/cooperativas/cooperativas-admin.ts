import {
  CommonModule
} from '@angular/common';

import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  RouterLink
} from '@angular/router';

import {
  Cooperativa
} from '../../models/cooperativa.model';

import {
  CooperativasService
} from '../../services/cooperativas.service';

@Component({
  selector: 'app-cooperativas-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './cooperativas-admin.html',
  styleUrl: './cooperativas-admin.css'
})
export class CooperativasAdmin
  implements OnInit {

  private readonly servicio =
    inject(CooperativasService);

  private readonly fb =
    inject(FormBuilder);

  readonly cooperativas =
    signal<Cooperativa[]>([]);

  readonly cargando =
    signal(false);

  readonly guardando =
    signal(false);

  readonly error =
    signal('');

  readonly mensaje =
    signal('');

  readonly mostrarFormulario =
    signal(false);

  readonly mostrarConfirmacion =
    signal(false);

  readonly cooperativaEditando =
    signal<Cooperativa | null>(
      null
    );

  readonly cooperativaEstado =
    signal<Cooperativa | null>(
      null
    );

  readonly filtros =
    this.fb.group({
      busqueda: [''],
      estado: ['']
    });

  readonly formulario =
    this.fb.group({

      nombre: [
        '',
        [
          Validators.required,
          Validators.maxLength(150)
        ]
      ],

      ruc: [
        '',
        [
          Validators.maxLength(20)
        ]
      ]

    });

  readonly formularioUsuario =
    this.fb.group({

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

      password: [
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

    this.buscar();

  }

  buscar(): void {

    const valores =
      this.filtros.getRawValue();

    let activa:
      boolean | null = null;

    if (
      valores.estado === 'activo'
    ) {
      activa = true;
    }

    if (
      valores.estado === 'inactivo'
    ) {
      activa = false;
    }

    this.cargando.set(true);

    this.error.set('');

    this.servicio
      .listarAdmin(
        valores.busqueda ?? '',
        activa
      )
      .subscribe({

        next: cooperativas => {

          this.cooperativas.set(
            cooperativas
          );

          this.cargando.set(false);

        },

        error: error => {

          this.cargando.set(false);

          this.error.set(
            this.obtenerMensajeError(
              error,
              'No se pudieron cargar las cooperativas.'
            )
          );

        }

      });

  }

  limpiarFiltros(): void {

    this.filtros.reset({
      busqueda: '',
      estado: ''
    });

    this.buscar();

  }

  abrirCrear(): void {

    this.limpiarMensajes();

    this.cooperativaEditando.set(
      null
    );

    this.formulario.reset({
      nombre: '',
      ruc: ''
    });

    this.formularioUsuario.reset({
      nombres: '',
      apellidos: '',
      correo: '',
      password: '',
      confirmarPassword: ''
    });

    this.mostrarFormulario.set(
      true
    );

  }

  abrirEditar(
    cooperativa: Cooperativa
  ): void {

    this.limpiarMensajes();

    this.cooperativaEditando.set(
      cooperativa
    );

    this.formulario.reset({
      nombre:
        cooperativa.nombre,

      ruc:
        cooperativa.ruc ?? ''
    });

    this.mostrarFormulario.set(
      true
    );

  }

  cerrarFormulario(): void {

    if (
      this.guardando()
    ) {
      return;
    }

    this.mostrarFormulario.set(
      false
    );

    this.cooperativaEditando.set(
      null
    );

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

    const nombre =
      valores.nombre?.trim() ?? '';

    const ruc =
      this.textoOpcional(
        valores.ruc
      );

    if (!nombre) {

      this.error.set(
        'El nombre de la cooperativa es obligatorio.'
      );

      return;
    }

    const editando =
      this.cooperativaEditando();

    if (!editando) {

      if (
        this.formularioUsuario
          .invalid
      ) {

        this.formularioUsuario
          .markAllAsTouched();

        return;
      }

      const usuario =
        this.formularioUsuario
          .getRawValue();

      if (
        usuario.password !==
        usuario.confirmarPassword
      ) {

        this.error.set(
          'Las contraseñas no coinciden.'
        );

        return;
      }

      this.guardando.set(true);

      this.servicio
        .crearAdmin({

          nombre,

          ruc,

          usuarioNombres:
            usuario.nombres!
              .trim(),

          usuarioApellidos:
            usuario.apellidos!
              .trim(),

          usuarioCorreo:
            usuario.correo!
              .trim(),

          usuarioPassword:
            usuario.password!,

          usuarioConfirmarPassword:
            usuario.confirmarPassword!

        })
        .subscribe({

          next: respuesta => {

            this.guardando.set(
              false
            );

            this.mostrarFormulario.set(
              false
            );

            this.mensaje.set(
              `Cooperativa creada correctamente. El usuario ${respuesta.usuario.correo} ya puede iniciar sesión.`
            );

            this.buscar();

          },

          error: error => {

            this.guardando.set(
              false
            );

            this.error.set(
              this.obtenerMensajeError(
                error,
                'No se pudo crear la cooperativa.'
              )
            );

          }

        });

      return;
    }

    this.guardando.set(true);

    this.servicio
      .actualizarAdmin(
        editando.id,
        {
          nombre,
          ruc
        }
      )
      .subscribe({

        next: () => {

          this.guardando.set(
            false
          );

          this.mostrarFormulario.set(
            false
          );

          this.cooperativaEditando.set(
            null
          );

          this.mensaje.set(
            'Cooperativa actualizada correctamente.'
          );

          this.buscar();

        },

        error: error => {

          this.guardando.set(
            false
          );

          this.error.set(
            this.obtenerMensajeError(
              error,
              'No se pudo actualizar la cooperativa.'
            )
          );

        }

      });

  }

  abrirConfirmacionEstado(
    cooperativa: Cooperativa
  ): void {

    this.limpiarMensajes();

    this.cooperativaEstado.set(
      cooperativa
    );

    this.mostrarConfirmacion.set(
      true
    );

  }

  cerrarConfirmacion(): void {

    if (
      this.guardando()
    ) {
      return;
    }

    this.mostrarConfirmacion.set(
      false
    );

    this.cooperativaEstado.set(
      null
    );

  }

  confirmarEstado(): void {

    const cooperativa =
      this.cooperativaEstado();

    if (!cooperativa) {
      return;
    }

    const nuevoEstado =
      !cooperativa.activa;

    this.guardando.set(true);

    this.servicio
      .cambiarEstado(
        cooperativa.id,
        nuevoEstado
      )
      .subscribe({

        next: respuesta => {

          this.guardando.set(
            false
          );

          this.mostrarConfirmacion.set(
            false
          );

          this.cooperativaEstado.set(
            null
          );

          this.mensaje.set(
            respuesta.message
          );

          this.buscar();

        },

        error: error => {

          this.guardando.set(
            false
          );

          this.mostrarConfirmacion.set(
            false
          );

          this.cooperativaEstado.set(
            null
          );

          this.error.set(
            this.obtenerMensajeError(
              error,
              'No se pudo cambiar el estado de la cooperativa.'
            )
          );

        }

      });

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

    this.error.set('');

    this.mensaje.set('');

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