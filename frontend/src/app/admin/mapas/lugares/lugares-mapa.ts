import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, NgZone, OnDestroy, OnInit, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import type { Map as MapaLibre } from 'maplibre-gl';
import { finalize } from 'rxjs';

import { Mapa } from '../../../shared/maps/mapa';
import { mensajeErrorLugar } from '../../lugares/lugar-error';
import { LugarDto } from '../../lugares/lugar.model';
import { LugarService } from '../../lugares/lugar.service';
import { coordenadasMapa, leerLugares } from './lugar-geografico';
import { MarcadoresLugares } from './marcadores-lugares';
import { identificadorMapa } from '../navegacion-mapa';

@Component({
  selector: 'app-lugares-mapa',
  standalone: true,
  imports: [Mapa, RouterLink],
  templateUrl: './lugares-mapa.html',
  styleUrl: './lugares-mapa.css'
})
export class LugaresMapa implements OnInit, OnDestroy {
  private readonly servicio = inject(LugarService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly documento = inject(DOCUMENT);
  private readonly zona = inject(NgZone);
  private readonly ruta = inject(ActivatedRoute, { optional: true });
  private readonly parametros = signal<ParamMap | null>(null);
  private mapa: MapaLibre | null = null;
  private marcadores: MarcadoresLugares | null = null;
  private destruido = false;
  private vistaAjustada = false;

  readonly lugares = signal<LugarDto[]>([]);
  readonly busqueda = signal('');
  readonly filtroEstado = signal('');
  readonly seleccionadoId = signal<number | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorMarcadores = signal<string | null>(null);
  readonly avisoNavegacion = signal<string | null>(null);
  readonly mapaDisponible = signal(false);
  readonly lugaresFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLocaleLowerCase('es');
    return this.lugares().filter(lugar => lugar.nombre.toLocaleLowerCase('es').includes(texto) &&
      (this.filtroEstado() === '' || lugar.activo === (this.filtroEstado() === 'activo')));
  });
  readonly conCoordenadas = computed(() => this.lugaresFiltrados().filter(lugar => coordenadasMapa(lugar.ubicacion) !== null));
  readonly sinCoordenadas = computed(() => this.lugaresFiltrados().length - this.conCoordenadas().length);
  readonly seleccionado = computed(() => this.lugaresFiltrados().find(lugar => lugar.id === this.seleccionadoId()) ?? null);
  readonly coordenadasSeleccionadas = computed(() => coordenadasMapa(this.seleccionado()?.ubicacion));

  constructor() {
    effect(() => {
      const visibles = this.lugaresFiltrados();
      // La selección no modifica el conjunto de marcadores ni dispara otro ajuste de cámara.
      untracked(() => this.sincronizar(visibles));
    });
    effect(() => {
      const parametros = this.parametros();
      const lugares = this.lugares();
      const cargando = this.cargando();
      const error = this.error();
      if (!parametros || cargando || error) return;
      untracked(() => {
        this.avisoNavegacion.set(null);
        const id = identificadorMapa(parametros, 'lugarId');
        if (id === null) return;
        this.limpiarFiltros();
        this.seleccionadoId.set(null);
        this.marcadores?.seleccionar(null);
        if (id === 'invalido') this.avisoNavegacion.set('El identificador del lugar no es válido.');
        else if (!lugares.some(lugar => lugar.id === id)) this.avisoNavegacion.set('El lugar solicitado no existe en el catálogo disponible.');
        else this.seleccionar(id);
      });
    });
  }

  ngOnInit(): void {
    this.ruta?.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(parametros => this.parametros.set(parametros));
    this.cargar();
  }

  cargar(): void {
    if (this.cargando() || this.destruido) return;
    this.error.set(null);
    this.cargando.set(true);
    this.servicio.listar().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargando.set(false))
    ).subscribe({
      next: respuesta => {
        const lugares = leerLugares(respuesta);
        if (lugares === null) {
          this.error.set('La respuesta del servidor no contiene una lista de lugares válida.');
          this.lugares.set([]);
          return;
        }
        this.lugares.set(lugares);
      },
      error: (causa: unknown) => {
        this.error.set(mensajeErrorLugar(causa));
        this.lugares.set([]);
      }
    });
  }

  alPrepararMapa(mapa: MapaLibre): void {
    if (this.destruido || this.mapa === mapa) return;
    this.marcadores?.destruir();
    this.mapa = mapa;
    this.vistaAjustada = false;
    this.marcadores = new MarcadoresLugares(mapa, this.documento, id => {
      this.zona.run(() => this.seleccionar(id, false));
    });
    this.mapaDisponible.set(true);
    this.sincronizar(this.lugaresFiltrados());
  }

  seleccionar(id: number, moverCamara = true): void {
    if (this.destruido || !this.lugaresFiltrados().some(lugar => lugar.id === id)) return;
    this.seleccionadoId.set(id);
    this.errorMarcadores.set(null);
    try {
      this.marcadores?.seleccionar(id);
      if (moverCamara) this.marcadores?.centrar(id);
    } catch {
      this.errorMarcadores.set('No se pudo mostrar el lugar en el mapa. Puedes consultar su información en el panel.');
    }
  }

  centrarSeleccionado(): void {
    const id = this.seleccionado()?.id;
    if (id !== undefined) this.seleccionar(id);
  }

  mostrarTodos(): void {
    if (this.destruido) return;
    try {
      this.marcadores?.ajustarVista();
    } catch {
      this.errorMarcadores.set('No se pudo ajustar la vista del mapa. Inténtalo de nuevo.');
    }
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtroEstado.set('');
  }

  tieneCoordenadas(lugar: LugarDto): boolean {
    return coordenadasMapa(lugar.ubicacion) !== null;
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.marcadores?.destruir();
    this.marcadores = null;
    this.mapa = null;
  }

  private sincronizar(visibles: readonly LugarDto[]): void {
    if (this.destruido) return;
    if (!visibles.some(lugar => lugar.id === this.seleccionadoId())) this.seleccionadoId.set(null);
    if (!this.marcadores) return;
    this.errorMarcadores.set(null);
    try {
      this.marcadores.actualizar(visibles);
      this.marcadores.seleccionar(this.seleccionadoId());
      if (!this.vistaAjustada && visibles.some(lugar => this.tieneCoordenadas(lugar))) {
        const seleccionado = this.seleccionado();
        if (seleccionado && this.tieneCoordenadas(seleccionado)) this.marcadores.centrar(seleccionado.id);
        else this.marcadores.ajustarVista();
        this.vistaAjustada = true;
      }
    } catch {
      this.errorMarcadores.set('No se pudieron representar los lugares en el mapa. La lista sigue disponible para consulta.');
    }
  }
}
