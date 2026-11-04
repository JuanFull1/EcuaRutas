import {
  CommonModule
} from '@angular/common';

import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  of,
  switchMap
} from 'rxjs';

import {
  Cooperativa
} from '../../models/cooperativa.model';

import {
  CooperativasService
} from '../../services/cooperativas.service';

interface RedesSocialesCooperativa {
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  sitioWeb?: string;
}

@Component({
  selector: 'app-mi-cooperativa',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './mi-cooperativa.html',
  styleUrl: './mi-cooperativa.css'
})
export class MiCooperativa
  implements OnInit, OnDestroy {

  private readonly servicio =
    inject(CooperativasService);

  private readonly fb =
    inject(FormBuilder);

  readonly cooperativa =
    signal<Cooperativa | null>(
      null
    );

  readonly cargando =
    signal(true);

  readonly guardando =
    signal(false);

  readonly error =
    signal('');

  readonly archivoLogo =
    signal<File | null>(
      null
    );

  readonly logoTemporal =
    signal('');

  readonly mostrarResultado =
    signal(false);

  readonly resultadoExito =
    signal(true);

  readonly resultadoTitulo =
    signal('');

  readonly resultadoMensaje =
    signal('');

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
        {
          value: '',
          disabled: true
        }
      ],

      descripcion: [
        '',
        [
          Validators.maxLength(2000)
        ]
      ],

      telefono: [
        '',
        [
          Validators.maxLength(30)
        ]
      ],

      correo: [
        '',
        [
          Validators.email,
          Validators.maxLength(150)
        ]
      ],

      direccion: [
        '',
        [
          Validators.maxLength(500)
        ]
      ],

      colorPrimario: [
        '#0D6EFD',
        [
          Validators.pattern(
            /^#[0-9A-Fa-f]{6}$/
          )
        ]
      ],

      colorSecundario: [
        '#212529',
        [
          Validators.pattern(
            /^#[0-9A-Fa-f]{6}$/
          )
        ]
      ],

      facebook: [''],

      instagram: [''],

      whatsapp: [''],

      sitioWeb: [''],

      informacionSoporte: [
        '',
        [
          Validators.maxLength(2000)
        ]
      ]

    });

  ngOnInit(): void {

    this.cargar();

  }

  ngOnDestroy(): void {

    this.liberarLogoTemporal();

  }

  cargar(): void {

    this.cargando.set(true);

    this.error.set('');

    this.servicio
      .obtenerMiCooperativa()
      .subscribe({

        next: cooperativa => {

          this.cooperativa.set(
            cooperativa
          );

          this.cargarFormulario(
            cooperativa
          );

          this.cargando.set(false);

        },

        error: error => {

          this.cargando.set(false);

          this.error.set(
            this.obtenerMensajeError(
              error,
              'No se pudo cargar la información de la cooperativa.'
            )
          );

        }

      });

  }

  seleccionarLogo(
    event: Event
  ): void {

    const input =
      event.target as
        HTMLInputElement;

    const archivo =
      input.files?.[0];

    if (!archivo) {
      return;
    }

    const tiposPermitidos = [
      'image/png',
      'image/jpeg',
      'image/webp'
    ];

    if (
      !tiposPermitidos.includes(
        archivo.type
      )
    ) {
      input.value = '';

      this.mostrarModal(
        false,
        'Imagen no válida',
        'Selecciona un archivo PNG, JPG, JPEG o WEBP.'
      );

      return;
    }

    const maximo =
      2 * 1024 * 1024;

    if (
      archivo.size >
      maximo
    )
    {
      input.value = '';

      this.mostrarModal(
        false,
        'Imagen demasiado grande',
        'El logo no puede superar los 2 MB.'
      );

      return;
    }

    this.liberarLogoTemporal();

    const url =
      URL.createObjectURL(
        archivo
      );

    this.archivoLogo.set(
      archivo
    );

    this.logoTemporal.set(
      url
    );

  }

  quitarSeleccionLogo(): void {

    this.archivoLogo.set(
      null
    );

    this.liberarLogoTemporal();

  }

  guardar(): void {

    if (
      this.formulario.invalid
    )
    {
      this.formulario
        .markAllAsTouched();

      this.mostrarModal(
        false,
        'Revisa la información',
        'Existen campos con datos inválidos. Corrígelos antes de guardar.'
      );

      return;
    }

    const valores =
      this.formulario
        .getRawValue();

    const nombre =
      valores.nombre
        ?.trim() ?? '';

    if (!nombre)
    {
      this.mostrarModal(
        false,
        'Nombre requerido',
        'El nombre de la cooperativa es obligatorio.'
      );

      return;
    }

    const redes:
      RedesSocialesCooperativa = {};

    const facebook =
      this.textoOpcional(
        valores.facebook
      );

    const instagram =
      this.textoOpcional(
        valores.instagram
      );

    const whatsapp =
      this.textoOpcional(
        valores.whatsapp
      );

    const sitioWeb =
      this.textoOpcional(
        valores.sitioWeb
      );

    if (facebook) {
      redes.facebook =
        facebook;
    }

    if (instagram) {
      redes.instagram =
        instagram;
    }

    if (whatsapp) {
      redes.whatsapp =
        whatsapp;
    }

    if (sitioWeb) {
      redes.sitioWeb =
        sitioWeb;
    }

    this.guardando.set(
      true
    );

    this.error.set('');

    const logo =
      this.archivoLogo();

    this.servicio
      .actualizarMiCooperativa({

        nombre,

        descripcion:
          this.textoOpcional(
            valores.descripcion
          ),

        telefono:
          this.textoOpcional(
            valores.telefono
          ),

        correo:
          this.textoOpcional(
            valores.correo
          ),

        direccion:
          this.textoOpcional(
            valores.direccion
          ),

        colorPrimario:
          this.textoOpcional(
            valores.colorPrimario
          ),

        colorSecundario:
          this.textoOpcional(
            valores.colorSecundario
          ),

        redesSociales:
          JSON.stringify(
            redes
          ),

        informacionSoporte:
          this.textoOpcional(
            valores.informacionSoporte
          )

      })
      .pipe(
        switchMap(
          cooperativa => {

            if (!logo)
            {
              return of(
                cooperativa
              );
            }

            return this.servicio
              .subirLogo(
                logo
              );
          }
        )
      )
      .subscribe({

        next: cooperativa => {

          this.guardando.set(
            false
          );

          this.cooperativa.set(
            cooperativa
          );

          this.archivoLogo.set(
            null
          );

          this.liberarLogoTemporal();

          this.cargarFormulario(
            cooperativa
          );

          this.mostrarModal(
            true,
            'Cambios guardados',
            'La información de la cooperativa se actualizó correctamente.'
          );

        },

        error: error => {

          this.guardando.set(
            false
          );

          this.mostrarModal(
            false,
            'No se pudieron guardar los cambios',
            this.obtenerMensajeError(
              error,
              'Ocurrió un error al actualizar la cooperativa.'
            )
          );

        }

      });

  }

  restablecer(): void {

    const cooperativa =
      this.cooperativa();

    if (!cooperativa) {
      return;
    }

    this.archivoLogo.set(
      null
    );

    this.liberarLogoTemporal();

    this.cargarFormulario(
      cooperativa
    );

  }

  cerrarResultado(): void {

    this.mostrarResultado.set(
      false
    );

  }

  colorPrimarioVista(): string {

    return (
      this.formulario
        .controls
        .colorPrimario
        .value ||
      '#0D6EFD'
    );

  }

  colorSecundarioVista(): string {

    return (
      this.formulario
        .controls
        .colorSecundario
        .value ||
      '#212529'
    );

  }

  logoVista(): string {

    if (
      this.logoTemporal()
    )
    {
      return this.logoTemporal();
    }

    return this.servicio
      .resolverLogoUrl(
        this.cooperativa()
          ?.logoUrl
      );

  }

  nombreArchivoLogo(): string {

    return (
      this.archivoLogo()
        ?.name ??
      'Ningún archivo seleccionado'
    );

  }

  private cargarFormulario(
    cooperativa: Cooperativa
  ): void {

    const redes =
      this.obtenerRedesSociales(
        cooperativa.redesSociales
      );

    this.formulario.reset({

      nombre:
        cooperativa.nombre,

      ruc:
        cooperativa.ruc ?? '',

      descripcion:
        cooperativa.descripcion ?? '',

      telefono:
        cooperativa.telefono ?? '',

      correo:
        cooperativa.correo ?? '',

      direccion:
        cooperativa.direccion ?? '',

      colorPrimario:
        cooperativa.colorPrimario ??
        '#0D6EFD',

      colorSecundario:
        cooperativa.colorSecundario ??
        '#212529',

      facebook:
        redes.facebook ?? '',

      instagram:
        redes.instagram ?? '',

      whatsapp:
        redes.whatsapp ?? '',

      sitioWeb:
        redes.sitioWeb ?? '',

      informacionSoporte:
        cooperativa
          .informacionSoporte ?? ''

    });

  }

  private mostrarModal(
    exito: boolean,
    titulo: string,
    mensaje: string
  ): void {

    this.resultadoExito.set(
      exito
    );

    this.resultadoTitulo.set(
      titulo
    );

    this.resultadoMensaje.set(
      mensaje
    );

    this.mostrarResultado.set(
      true
    );

  }

  private liberarLogoTemporal(): void {

    const url =
      this.logoTemporal();

    if (url)
    {
      URL.revokeObjectURL(
        url
      );
    }

    this.logoTemporal.set(
      ''
    );

  }

  private obtenerRedesSociales(
    valor: string
  ): RedesSocialesCooperativa {

    if (!valor) {
      return {};
    }

    try
    {
      const objeto =
        JSON.parse(
          valor
        );

      if (
        objeto &&
        typeof objeto === 'object'
      )
      {
        return objeto;
      }

      return {};
    }
    catch
    {
      return {};
    }

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