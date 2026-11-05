
import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  input,
  NgZone,
  OnDestroy,
  OnInit,
  output,
  signal,
  viewChild
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Marker } from 'maplibre-gl';
import type {
  Map as MapaLibre,
  MapMouseEvent
} from 'maplibre-gl';

import {
  CENTRO_ECUADOR,
  ZOOM_ECUADOR
} from '../../shared/maps/mapa.config';
import { Mapa } from '../../shared/maps/mapa';
import {
  ActualizarLugarDto,
  CrearLugarDto,
  LugarDto,
  TipoLugar
} from './lugar.model';

export type GuardarLugar =
  | { modo: 'crear'; datos: CrearLugarDto }
  | { modo: 'editar'; id: number; datos: ActualizarLugarDto };

const nombreRequerido: ValidatorFn = control =>
  typeof control.value === 'string' &&
  control.value.trim().length > 0
    ? null
    : { required: true };

const numeroFinito: ValidatorFn = control =>
  control.value === null ||
  (typeof control.value === 'number' &&
    Number.isFinite(control.value))
    ? null
    : { numero: true };

const coordenadasCompletas: ValidatorFn = (
  grupo: AbstractControl
): ValidationErrors | null => {
  const latitud = grupo.get('latitud')?.value;
  const longitud = grupo.get('longitud')?.value;

  return (latitud == null) === (longitud == null)
    ? null
    : { coordenadasIncompletas: true };
};

@Component({
  selector: 'app-lugar-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, Mapa],
  templateUrl: './lugar-formulario.html',
  styleUrl: './lugar-formulario.css'
})
export class LugarFormulario
  implements OnInit, AfterViewInit, OnDestroy {

  private readonly fb = inject(FormBuilder);
  private readonly documento = inject(DOCUMENT);
  private readonly zona = inject(NgZone);
  private readonly nombreInput =
    viewChild<ElementRef<HTMLInputElement>>('nombreInput');

  private mapa: MapaLibre | null = null;
  private marcador: Marker | null = null;

  readonly lugar = input<LugarDto | null>(null);
  readonly guardando = input(false);
  readonly autorizado = input(false);
  readonly error = input<string | null>(null);

  readonly guardarLugar = output<GuardarLugar>();
  readonly cancelar = output<void>();

  readonly tipos: TipoLugar[] = [
    'CIUDAD',
    'TERMINAL',
    'PARADA'
  ];

  readonly selectorMapaVisible = signal(false);

  readonly centroMapa = signal<[number, number]>(
    [...CENTRO_ECUADOR]
  );

  readonly zoomMapa = signal(ZOOM_ECUADOR);
  readonly errorMapa = signal<string | null>(null);

  readonly ciudadesReferencia = [
    {
      nombre: 'Ambato',
      longitud: -78.6167,
      latitud: -1.2417
    },
    {
      nombre: 'Quito',
      longitud: -78.4678,
      latitud: -0.1807
    },
    {
      nombre: 'Latacunga',
      longitud: -78.6155,
      latitud: -0.9332
    },
    {
      nombre: 'Riobamba',
      longitud: -78.6471,
      latitud: -1.6635
    },
    {
      nombre: 'Guayaquil',
      longitud: -79.8862,
      latitud: -2.1709
    },
    {
      nombre: 'Cuenca',
      longitud: -78.983,
      latitud: -2.9006
    },
    {
      nombre: 'Loja',
      longitud: -79.2042,
      latitud: -3.9931
    }
  ];

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control('', [
      nombreRequerido,
      Validators.maxLength(150)
    ]),

    provincia: this.fb.nonNullable.control(
      '',
      Validators.maxLength(100)
    ),

    canton: this.fb.nonNullable.control(
      '',
      Validators.maxLength(100)
    ),

    tipo: this.fb.nonNullable.control<TipoLugar | ''>('', [
      Validators.required,
      Validators.pattern(/^(CIUDAD|TERMINAL|PARADA)$/)
    ]),

    latitud: this.fb.control<number | null>(null, [
      numeroFinito,
      Validators.min(-90),
      Validators.max(90)
    ]),

    longitud: this.fb.control<number | null>(null, [
      numeroFinito,
      Validators.min(-180),
      Validators.max(180)
    ]),

    activo: this.fb.nonNullable.control(false)
  }, {
    validators: coordenadasCompletas
  });

  ngOnInit(): void {
    const lugar = this.lugar();

    if (lugar === null) return;

    this.form.reset({
      nombre: lugar.nombre,
      provincia: lugar.provincia ?? '',
      canton: lugar.canton ?? '',
      tipo: lugar.tipo,
      latitud: lugar.ubicacion?.latitud ?? null,
      longitud: lugar.ubicacion?.longitud ?? null,
      activo: lugar.activo
    });

    if (this.coordenadasValidas()) {
      this.centroMapa.set([
        this.form.controls.longitud.value!,
        this.form.controls.latitud.value!
      ]);

      this.zoomMapa.set(15);
    }
  }

  ngAfterViewInit(): void {
    this.nombreInput()?.nativeElement.focus();
  }

  invalido(
    campo: keyof typeof this.form.controls
  ): boolean {
    const control = this.form.controls[campo];

    return control.invalid &&
      (control.touched || control.dirty);
  }

  coordenadasIncompletas(): boolean {
    return this.form.hasError('coordenadasIncompletas') &&
      (
        this.form.controls.latitud.touched ||
        this.form.controls.longitud.touched
      );
  }

  abrirSelectorMapa(): void {
    if (!this.autorizado() || this.guardando()) return;

    this.errorMapa.set(null);
    this.selectorMapaVisible.set(true);
  }

  cerrarSelectorMapa(): void {
    this.desconectarMapa();
    this.selectorMapaVisible.set(false);
  }

  alPrepararMapa(mapa: MapaLibre): void {
    if (this.mapa === mapa) return;

    this.desconectarMapa();

    this.mapa = mapa;
    this.mapa.on('click', this.alPulsarMapa);

    this.sincronizarMarcador(false);
  }

  irACiudad(valor: string): void {
    const ciudad = this.ciudadesReferencia.find(
      item => item.nombre === valor
    );

    if (!ciudad) return;

    // Mueve la cámara sin guardar coordenadas.
    this.mapa?.easeTo({
      center: [
        ciudad.longitud,
        ciudad.latitud
      ],
      zoom: 13,
      duration: 450
    });
  }

  limpiarCoordenadas(): void {
    if (!this.autorizado() || this.guardando()) return;

    this.form.patchValue({
      latitud: null,
      longitud: null
    });

    this.form.controls.latitud.markAsDirty();
    this.form.controls.longitud.markAsDirty();

    this.eliminarMarcador();
  }

  sincronizarMarcador(centrar = true): void {
    if (!this.mapa) return;

    if (!this.coordenadasValidas()) {
      this.eliminarMarcador();
      return;
    }

    const coordenadas: [number, number] = [
      this.form.controls.longitud.value!,
      this.form.controls.latitud.value!
    ];

    if (!this.marcador) {
      const elemento = this.documento.createElement('div');

      elemento.className = 'ecuarutas-marcador-editable';
      elemento.setAttribute('role', 'img');
      elemento.setAttribute(
        'aria-label',
        'Ubicación del lugar. Arrastra para ajustar.'
      );

      this.marcador = new Marker({
        element: elemento,
        draggable: true,
        anchor: 'bottom'
      });

      this.marcador.on(
        'dragend',
        this.alArrastrarMarcador
      );

      this.marcador
        .setLngLat(coordenadas)
        .addTo(this.mapa);

    } else {
      this.marcador.setLngLat(coordenadas);
    }

    this.marcador.getElement().textContent =
      this.iconoTipo();

    if (centrar) {
      this.mapa.easeTo({
        center: coordenadas,
        zoom: Math.max(this.mapa.getZoom(), 14),
        duration: 350
      });
    }
  }

  guardar(): void {
    if (this.guardando() || !this.autorizado()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();

    const datos: CrearLugarDto = {
      nombre: valor.nombre.trim(),
      provincia: valor.provincia.trim() || null,
      canton: valor.canton.trim() || null,
      tipo: valor.tipo as TipoLugar,

      ubicacion:
        valor.latitud === null ||
        valor.longitud === null
          ? null
          : {
              latitud: valor.latitud,
              longitud: valor.longitud
            }
    };

    const lugar = this.lugar();

    this.guardarLugar.emit(
      lugar === null
        ? {
            modo: 'crear',
            datos
          }
        : {
            modo: 'editar',
            id: lugar.id,
            datos: {
              ...datos,
              activo: valor.activo
            }
          }
    );
  }

  ngOnDestroy(): void {
    this.desconectarMapa();
  }

  private readonly alPulsarMapa = (
    evento: MapMouseEvent
  ): void => {
    if (!this.autorizado() || this.guardando()) return;

    this.zona.run(() => {
      this.asignarCoordenadas(
        evento.lngLat.lat,
        evento.lngLat.lng
      );
    });
  };

  private readonly alArrastrarMarcador = (): void => {
    if (!this.marcador) return;

    if (!this.autorizado() || this.guardando()) {
      this.sincronizarMarcador(false);
      return;
    }

    const posicion = this.marcador.getLngLat();

    this.zona.run(() => {
      this.asignarCoordenadas(
        posicion.lat,
        posicion.lng
      );
    });
  };

  private asignarCoordenadas(
    latitud: number,
    longitud: number
  ): void {
    if (
      !Number.isFinite(latitud) ||
      !Number.isFinite(longitud)
    ) return;

    this.form.patchValue({
      latitud: Number(latitud.toFixed(6)),
      longitud: Number(longitud.toFixed(6))
    });

    this.form.controls.latitud.markAsDirty();
    this.form.controls.longitud.markAsDirty();

    this.form.controls.latitud.markAsTouched();
    this.form.controls.longitud.markAsTouched();

    this.sincronizarMarcador(false);
  }

  private coordenadasValidas(): boolean {
    const lat = this.form.controls.latitud.value;
    const lon = this.form.controls.longitud.value;

    return (
      typeof lat === 'number' &&
      Number.isFinite(lat) &&
      lat >= -90 &&
      lat <= 90 &&
      typeof lon === 'number' &&
      Number.isFinite(lon) &&
      lon >= -180 &&
      lon <= 180
    );
  }

  private iconoTipo(): string {
    switch (this.form.controls.tipo.value) {
      case 'CIUDAD':
        return '🏙️';

      case 'TERMINAL':
        return '🏢';

      case 'PARADA':
        return '🚏';

      default:
        return '📍';
    }
  }

  private eliminarMarcador(): void {
    if (!this.marcador) return;

    this.marcador.off(
      'dragend',
      this.alArrastrarMarcador
    );

    this.marcador.remove();
    this.marcador = null;
  }

  private desconectarMapa(): void {
    this.eliminarMarcador();
    this.mapa?.off('click', this.alPulsarMapa);
    this.mapa = null;
  }
}
