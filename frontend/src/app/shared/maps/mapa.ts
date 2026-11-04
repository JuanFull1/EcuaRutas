import {
  AfterViewInit, Component, ElementRef, inject, input, NgZone, OnChanges, OnDestroy,
  output, signal, SimpleChanges, viewChild
} from '@angular/core';
import { Map, NavigationControl, getWorkerUrl, setWorkerUrl } from 'maplibre-gl';
import type { JumpToOptions, LngLatLike, MapEventType, MapOptions } from 'maplibre-gl';

import { CENTRO_ECUADOR, MAPA_ESTILO_BASE, MAPA_WORKER_URL, ZOOM_ECUADOR } from './mapa.config';

export type EstiloMapa = NonNullable<MapOptions['style']>;

@Component({
  selector: 'app-mapa',
  standalone: true,
  templateUrl: './mapa.html',
  styleUrl: './mapa.css'
})
export class Mapa implements AfterViewInit, OnChanges, OnDestroy {
  private readonly zona = inject(NgZone);
  private readonly workerUrl = inject(MAPA_WORKER_URL);
  private readonly contenedor = viewChild.required<ElementRef<HTMLDivElement>>('contenedor');
  private mapa: Map | null = null;
  private inicializado = false;
  private destruido = false;

  readonly centro = input<LngLatLike>([...CENTRO_ECUADOR]);
  readonly zoom = input(ZOOM_ECUADOR);
  readonly estilo = input<EstiloMapa>(inject(MAPA_ESTILO_BASE));
  readonly etiqueta = input('Mapa geográfico');
  readonly mapaListo = output<Map>();
  readonly falloMapa = output<unknown>();
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  private readonly alCargar = (): void => {
    if (this.destruido || !this.mapa) return;
    this.zona.run(() => {
      this.cargando.set(false);
      this.error.set(null);
      this.mapaListo.emit(this.mapa!);
    });
  };

  private readonly alCargarEstilo = (): void => {
    if (this.destruido) return;
    this.zona.run(() => {
      this.cargando.set(false);
      this.error.set(null);
    });
  };

  private readonly alFallar = (evento: MapEventType['error']): void => {
    this.mostrarError(evento.error, 'No se pudo cargar parte del mapa. Revisa tu conexión.');
  };

  ngAfterViewInit(): void {
    if (this.inicializado || this.destruido) return;
    this.inicializado = true;
    this.zona.runOutsideAngular(() => {
      try {
        // Respeta la configuración global de MapLibre si el consumidor ya proporcionó un worker.
        if (!getWorkerUrl()) setWorkerUrl(this.workerUrl);
        this.mapa = new Map({
          container: this.contenedor().nativeElement,
          center: this.centro(),
          zoom: this.zoom(),
          style: this.estilo(),
          trackResize: true,
          attributionControl: { compact: false },
          locale: {
            'Map.Title': this.etiqueta(),
            'NavigationControl.ZoomIn': 'Acercar',
            'NavigationControl.ZoomOut': 'Alejar',
            'AttributionControl.ToggleAttribution': 'Mostrar atribución'
          }
        });
        this.mapa.on('load', this.alCargar);
        this.mapa.on('style.load', this.alCargarEstilo);
        this.mapa.on('error', this.alFallar);
        this.mapa.addControl(new NavigationControl({ showCompass: false }), 'top-right');
      } catch (causa: unknown) {
        this.liberarMapa();
        this.mostrarError(causa, 'No se pudo iniciar el mapa en este navegador.');
      }
    });
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (!this.mapa || this.destruido) return;
    this.zona.runOutsideAngular(() => {
      try {
        if (cambios['estilo']) {
          this.cargando.set(true);
          this.error.set(null);
          this.mapa!.setStyle(this.estilo());
        }
        const camara: JumpToOptions = {};
        if (cambios['centro']) camara.center = this.centro();
        if (cambios['zoom']) camara.zoom = this.zoom();
        if (cambios['centro'] || cambios['zoom']) this.mapa!.jumpTo(camara);
      } catch (causa: unknown) {
        this.mostrarError(causa, 'No se pudo actualizar la vista del mapa.');
      }
    });
  }

  // trackResize de MapLibre 6 observa también el contenedor mediante ResizeObserver.
  // Este método permite solicitar un ajuste adicional después de una transición del consumidor.
  redimensionar(): void {
    if (this.destruido || !this.mapa) return;
    this.zona.runOutsideAngular(() => {
      try {
        this.mapa!.resize();
      } catch (causa: unknown) {
        this.mostrarError(causa, 'No se pudo ajustar el tamaño del mapa.');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.destruido) return;
    this.destruido = true;
    this.zona.runOutsideAngular(() => this.liberarMapa());
  }

  private mostrarError(causa: unknown, mensaje: string): void {
    if (this.destruido) return;
    this.zona.run(() => {
      this.cargando.set(false);
      this.error.set(mensaje);
      this.falloMapa.emit(causa);
    });
  }

  private liberarMapa(): void {
    const mapa = this.mapa;
    this.mapa = null;
    if (!mapa) return;
    mapa.off('load', this.alCargar);
    mapa.off('style.load', this.alCargarEstilo);
    mapa.off('error', this.alFallar);
    mapa.remove();
  }
}
