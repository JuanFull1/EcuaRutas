import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, NgZone, OnDestroy, OnInit, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import type { Map as MapaLibre } from 'maplibre-gl';
import { Subscription, finalize } from 'rxjs';

import { Mapa } from '../../../shared/maps/mapa';
import { mensajeErrorLugar } from '../../lugares/lugar-error';
import { LugarDto } from '../../lugares/lugar.model';
import { LugarService } from '../../lugares/lugar.service';
import { RutaParadaDto } from '../../paradas/ruta-parada.model';
import { RutaParadaService } from '../../paradas/ruta-parada.service';
import { RutaDto } from '../../rutas/ruta.model';
import { RutaService } from '../../rutas/ruta.service';
import { leerLugares } from '../lugares/lugar-geografico';
import { construirRecorrido, leerParadas, leerRutas, RecorridoGeografico } from './recorrido-geografico';
import { RecursosRecorrido } from './recursos-recorrido';
import { identificadorMapa } from '../navegacion-mapa';

@Component({
  selector: 'app-rutas-mapa',
  standalone: true,
  imports: [Mapa, RouterLink, FormsModule],
  templateUrl: './rutas-mapa.html',
  styleUrl: './rutas-mapa.css'
})
export class RutasMapa implements OnInit, OnDestroy {
  private readonly rutaService = inject(RutaService);
  private readonly lugarService = inject(LugarService);
  private readonly paradaService = inject(RutaParadaService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly documento = inject(DOCUMENT);
  private readonly zona = inject(NgZone);
  private readonly ruta = inject(ActivatedRoute, { optional: true });
  private readonly parametros = signal<ParamMap | null>(null);
  private consultaParadas: Subscription | null = null;
  private mapa: MapaLibre | null = null;
  private recursos: RecursosRecorrido | null = null;
  private rutaAjustada: number | null = null;
  private destruido = false;

  readonly rutas = signal<RutaDto[]>([]);
  readonly lugares = signal<LugarDto[]>([]);
  readonly paradas = signal<RutaParadaDto[] | null>(null);
  readonly rutaId = signal<number | null>(null);
  readonly busqueda = signal('');
  readonly seleccionada = signal<string | null>(null);
  readonly cargandoRutas = signal(false);
  readonly cargandoLugares = signal(false);
  readonly cargandoParadas = signal(false);
  readonly errorRutas = signal<string | null>(null);
  readonly errorLugares = signal<string | null>(null);
  readonly errorParadas = signal<string | null>(null);
  readonly errorMapa = signal<string | null>(null);
  readonly avisoNavegacion = signal<string | null>(null);
  readonly avisoParada = signal<string | null>(null);
  readonly mapaDisponible = signal(false);
  readonly cargando = computed(() => this.cargandoRutas() || this.cargandoLugares() || this.cargandoParadas());
  readonly rutaSeleccionada = computed(() => this.rutas().find(ruta => ruta.id === this.rutaId()) ?? null);
  readonly rutasFiltradas = computed(() => {
    const busqueda = this.busqueda().trim().toLocaleLowerCase('es');
    return this.rutas().filter(ruta => ruta.nombre.toLocaleLowerCase('es').includes(busqueda));
  });
  readonly seleccionFueraBusqueda = computed(() => this.rutaSeleccionada() && !this.rutasFiltradas().some(ruta => ruta.id === this.rutaId()));
  readonly recorrido = computed(() => {
    const ruta = this.rutaSeleccionada();
    const paradas = this.paradas();
    return ruta && paradas !== null ? construirRecorrido(ruta, paradas, this.lugares()) : null;
  });
  readonly puntoSeleccionado = computed(() => this.recorrido()?.puntos.find(punto => punto.clave === this.seleccionada()) ?? null);
  readonly cantidadGeografica = computed(() => new Set(this.recorrido()?.puntos.filter(punto => punto.coordenadas).map(punto => punto.lugarId)).size);

  constructor() {
    effect(() => {
      const recorrido = this.recorrido();
      untracked(() => this.sincronizar(recorrido));
    });
    effect(() => {
      const parametros = this.parametros();
      const rutas = this.rutas();
      const cargando = this.cargandoRutas();
      const error = this.errorRutas();
      if (!parametros || cargando || error) return;
      untracked(() => {
        this.avisoNavegacion.set(null);
        const id = identificadorMapa(parametros, 'rutaId');
        if (id === null && !parametros.has('paradaId')) return;
        if (id === null || id === 'invalido') {
          this.seleccionarRuta(null);
          this.avisoNavegacion.set('El identificador de la ruta no es válido; una parada requiere su ruta.');
        } else if (!rutas.some(ruta => ruta.id === id)) {
          this.seleccionarRuta(null);
          this.avisoNavegacion.set('La ruta solicitada no existe en el catálogo disponible.');
        } else this.seleccionarRuta(id);
      });
    });
    effect(() => {
      const parametros = this.parametros();
      const recorrido = this.recorrido();
      untracked(() => {
        this.avisoParada.set(null);
        if (!parametros || !recorrido || identificadorMapa(parametros, 'rutaId') !== recorrido.rutaId) return;
        const id = identificadorMapa(parametros, 'paradaId');
        if (id === null) return;
        this.seleccionada.set(null);
        this.recursos?.seleccionar(null);
        if (id === 'invalido') this.avisoParada.set('El identificador de la parada no es válido.');
        else if (!recorrido.puntos.some(punto => punto.parada?.id === id)) this.avisoParada.set('La parada solicitada no pertenece a esta ruta o ya no está disponible.');
        else this.seleccionarPunto(`parada:${id}`);
      });
    });
  }

  ngOnInit(): void {
    this.ruta?.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(parametros => this.parametros.set(parametros));
    this.actualizar();
  }

  actualizar(): void {
    if (this.destruido || this.cargando()) return;
    this.cargarRutas();
    this.cargarLugares();
  }

  cargarRutas(): void {
    if (this.destruido || this.cargandoRutas()) return;
    this.cargandoRutas.set(true);
    this.errorRutas.set(null);
    this.rutaService.listar().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargandoRutas.set(false))).subscribe({
      next: respuesta => {
        const rutas = leerRutas(respuesta);
        if (rutas === null) {
          this.errorRutas.set('La respuesta del servidor no contiene una lista de rutas válida.');
          this.rutas.set([]);
          this.limpiarSeleccion(null);
          return;
        }
        this.rutas.set(rutas);
        if (this.rutaId() !== null && !this.rutaSeleccionada()) this.limpiarSeleccion(null);
        else if (this.rutaId() !== null) this.cargarParadas();
      },
      error: (causa: unknown) => {
        this.errorRutas.set(mensajeErrorLugar(causa));
        this.rutas.set([]);
        this.limpiarSeleccion(null);
      }
    });
  }

  cargarLugares(): void {
    if (this.destruido || this.cargandoLugares()) return;
    this.cargandoLugares.set(true);
    this.errorLugares.set(null);
    this.lugarService.listar().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargandoLugares.set(false))).subscribe({
      next: respuesta => {
        const lugares = leerLugares(respuesta);
        this.lugares.set(lugares ?? []);
        if (lugares === null) this.errorLugares.set('La respuesta del servidor no contiene una lista de lugares válida.');
      },
      error: (causa: unknown) => {
        this.errorLugares.set(mensajeErrorLugar(causa));
        this.lugares.set([]);
      }
    });
  }

  cambiarRuta(valor: string): void { this.seleccionarRuta(valor === '' ? null : Number(valor)); }

  seleccionarRuta(id: number | null): void {
    if (this.destruido || this.cargandoRutas() || id === this.rutaId() || (id !== null && !this.rutas().some(ruta => ruta.id === id))) return;
    this.limpiarSeleccion(id);
    this.rutaAjustada = null;
    if (id !== null) this.cargarParadas();
  }

  cargarParadas(): void {
    const rutaId = this.rutaSeleccionada()?.id;
    if (this.destruido || rutaId === undefined || this.cargandoParadas()) return;
    this.paradas.set(null);
    this.seleccionada.set(null);
    this.errorParadas.set(null);
    this.recursos?.actualizar(null);
    this.cargandoParadas.set(true);
    this.consultaParadas = this.paradaService.listar(rutaId).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.cargandoParadas.set(false))
    ).subscribe({
      next: respuesta => {
        if (this.rutaId() !== rutaId) return;
        const paradas = leerParadas(respuesta, rutaId);
        if (paradas === null) this.errorParadas.set('La respuesta de paradas no corresponde a esta ruta o contiene datos inválidos.');
        this.paradas.set(paradas);
      },
      error: (causa: unknown) => {
        if (this.rutaId() === rutaId) this.errorParadas.set(mensajeErrorLugar(causa));
      }
    });
  }

  alPrepararMapa(mapa: MapaLibre): void {
    if (this.destruido || this.mapa === mapa) return;
    this.recursos?.destruir();
    this.mapa = mapa;
    this.rutaAjustada = null;
    this.recursos = new RecursosRecorrido(mapa, this.documento,
      clave => this.zona.run(() => this.seleccionarPunto(clave, false)),
      () => this.zona.run(() => this.errorMapa.set('No se pudo restaurar el trazado del mapa. La información del recorrido sigue disponible.')));
    this.mapaDisponible.set(true);
    this.sincronizar(this.recorrido());
  }

  seleccionarPunto(clave: string, centrar = true): void {
    if (this.destruido || !this.recorrido()?.puntos.some(punto => punto.clave === clave)) return;
    this.seleccionada.set(clave);
    this.errorMapa.set(null);
    try {
      this.recursos?.seleccionar(clave);
      if (centrar) this.recursos?.centrar(clave);
    } catch { this.errorMapa.set('No se pudo mostrar el punto en el mapa. Sus datos siguen disponibles en el panel.'); }
  }

  mostrarRecorrido(): void {
    if (this.destruido) return;
    try { this.recursos?.ajustarVista(); }
    catch { this.errorMapa.set('No se pudo ajustar la vista del recorrido. Inténtalo de nuevo.'); }
  }

  nombreLugar(id: number): string { return this.lugares().find(lugar => lugar.id === id)?.nombre ?? `Lugar #${id} (no disponible)`; }

  ngOnDestroy(): void {
    this.destruido = true;
    this.recursos?.destruir();
    this.recursos = null;
    this.mapa = null;
  }

  private limpiarSeleccion(id: number | null): void {
    // Cancelar antes de iniciar otra consulta evita que finalize apague su indicador de carga.
    this.consultaParadas?.unsubscribe();
    this.rutaId.set(id);
    this.paradas.set(null);
    this.seleccionada.set(null);
    this.errorParadas.set(null);
    this.errorMapa.set(null);
    this.recursos?.actualizar(null);
  }

  private sincronizar(recorrido: RecorridoGeografico | null): void {
    if (this.destruido) return;
    if (!recorrido?.puntos.some(punto => punto.clave === this.seleccionada())) this.seleccionada.set(null);
    if (!this.recursos) return;
    this.errorMapa.set(null);
    try {
      this.recursos.actualizar(recorrido);
      this.recursos.seleccionar(this.seleccionada());
      if (recorrido && recorrido.rutaId !== this.rutaAjustada && this.cantidadGeografica() > 0) {
        const punto = this.puntoSeleccionado();
        if (punto?.coordenadas) this.recursos.centrar(punto.clave);
        else this.recursos.ajustarVista();
        this.rutaAjustada = recorrido.rutaId;
      }
    } catch { this.errorMapa.set('No se pudo representar el recorrido. Puedes consultar los datos en la lista.'); }
  }
}
