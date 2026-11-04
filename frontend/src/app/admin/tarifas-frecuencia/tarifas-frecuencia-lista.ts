import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnInit, WritableSignal, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription, finalize } from 'rxjs';
import { CooperativaResumen } from '../../models/admin-usuario.model';
import { AuthService } from '../../services/auth.service';
import { UsuariosAdminService } from '../../services/usuarios-admin.service';
import { FrecuenciaDto } from '../frecuencias/frecuencia.model';
import { FrecuenciaService } from '../frecuencias/frecuencia.service';
import { LugarDto } from '../lugares/lugar.model';
import { LugarService } from '../lugares/lugar.service';
import { RutaParadaDto } from '../paradas/ruta-parada.model';
import { RutaParadaService } from '../paradas/ruta-parada.service';
import { RutaDto } from '../rutas/ruta.model';
import { RutaService } from '../rutas/ruta.service';
import { mensajeErrorTarifa } from './tarifa-frecuencia-error';
import { GuardarTarifa, TarifaFrecuenciaFormulario } from './tarifa-frecuencia-formulario';
import { TarifaFrecuenciaDto, etiquetaParada, paradasDeFrecuencia, precioEnCentavos } from './tarifa-frecuencia.model';
import { TarifaFrecuenciaService } from './tarifa-frecuencia.service';

type Catalogo = 'cooperativas' | 'rutas' | 'lugares';

@Component({
  selector: 'app-tarifas-frecuencia-lista', standalone: true, imports: [CurrencyPipe, TarifaFrecuenciaFormulario],
  templateUrl: './tarifas-frecuencia-lista.html', styleUrl: './tarifas-frecuencia-lista.css'
})
export class TarifasFrecuenciaLista implements OnInit {
  private readonly servicio = inject(TarifaFrecuenciaService);
  private readonly frecuenciaService = inject(FrecuenciaService);
  private readonly paradaService = inject(RutaParadaService);
  private readonly cooperativaService = inject(UsuariosAdminService);
  private readonly rutaService = inject(RutaService);
  private readonly lugarService = inject(LugarService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogoBaja');
  private contextoSub: Subscription | null = null;
  private tarifasSub: Subscription | null = null;
  private paradasSub: Subscription | null = null;
  private detalleSub: Subscription | null = null;

  readonly frecuencias = signal<FrecuenciaDto[]>([]);
  readonly frecuenciaId = signal<number | null>(null);
  readonly contexto = signal<FrecuenciaDto | null>(null);
  readonly tarifas = signal<TarifaFrecuenciaDto[]>([]);
  readonly paradas = signal<RutaParadaDto[]>([]);
  readonly cooperativas = signal<CooperativaResumen[]>([]);
  readonly rutas = signal<RutaDto[]>([]);
  readonly lugares = signal<LugarDto[]>([]);
  readonly cargandoFrecuencias = signal(false);
  readonly cargandoContexto = signal(false);
  readonly cargandoTarifas = signal(false);
  readonly cargandoParadas = signal(false);
  readonly cargandoDetalle = signal(false);
  readonly guardando = signal(false);
  readonly desactivando = signal(false);
  readonly cargasNombres = signal<Record<Catalogo, boolean>>({ cooperativas: false, rutas: false, lugares: false });
  readonly erroresNombres = signal<Record<Catalogo, string | null>>({ cooperativas: null, rutas: null, lugares: null });
  readonly avisosNombres = computed(() => Object.values(this.erroresNombres()).filter((e): e is string => e !== null));
  readonly errorFrecuencias = signal<string | null>(null);
  readonly errorContexto = signal<string | null>(null);
  readonly errorTarifas = signal<string | null>(null);
  readonly errorParadas = signal<string | null>(null);
  readonly errorFormulario = signal<string | null>(null);
  readonly errorBaja = signal<string | null>(null);
  readonly exito = signal<string | null>(null);
  readonly formularioVisible = signal(false);
  readonly detalleVisible = signal(false);
  readonly seleccionada = signal<TarifaFrecuenciaDto | null>(null);
  readonly pendienteBaja = signal<TarifaFrecuenciaDto | null>(null);
  readonly busqueda = signal('');
  readonly filtroEstado = signal('');
  readonly pagina = signal(1);
  readonly tamanoPagina = 10;
  readonly paradasOrdenadas = computed(() => paradasDeFrecuencia(this.paradas(), this.contexto()));
  private readonly paradasPorId = computed(() => new Map(this.paradasOrdenadas().map(p => [p.id, p])));
  private readonly cooperativasPorId = computed(() => new Map(this.cooperativas().map(c => [c.id, c.nombre])));
  private readonly rutasPorId = computed(() => new Map(this.rutas().map(r => [r.id, r.nombre])));
  readonly panelAbierto = computed(() => this.formularioVisible() || this.detalleVisible() || this.pendienteBaja() !== null);
  readonly seleccionBloqueada = computed(() => this.guardando() || this.desactivando() || this.panelAbierto());
  readonly ocupado = computed(() => this.cargandoContexto() || this.cargandoTarifas() || this.cargandoParadas() || this.cargandoDetalle() || this.guardando() || this.desactivando());
  readonly tramoDisponible = computed(() => {
    const ordenadas = this.paradasOrdenadas();
    return !this.errorParadas() && !this.cargandoParadas() && ordenadas.length >= 2 && ordenadas[0].orden < ordenadas[ordenadas.length - 1].orden;
  });
  readonly puedeCrear = computed(() => this.contexto()?.activa === true && this.tramoDisponible() && !this.ocupado() && !this.panelAbierto());
  readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLocaleLowerCase('es');
    const orden = (id: number) => this.paradasPorId().get(id)?.orden ?? Number.MAX_SAFE_INTEGER;
    return this.tarifas().filter(t => t.frecuenciaId === this.contexto()?.id &&
      `${this.nombreParada(t.origenRutaParadaId)} ${this.nombreParada(t.destinoRutaParadaId)}`.toLocaleLowerCase('es').includes(texto) &&
      (this.filtroEstado() === '' || t.activa === (this.filtroEstado() === 'activa')))
      .sort((a, b) => orden(a.origenRutaParadaId) - orden(b.origenRutaParadaId) || orden(a.destinoRutaParadaId) - orden(b.destinoRutaParadaId) || a.id - b.id);
  });
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtradas().length / this.tamanoPagina)));
  readonly paginaActual = computed(() => Math.max(1, Math.min(this.pagina(), this.totalPaginas())));
  readonly filasPagina = computed(() => this.filtradas().slice((this.paginaActual() - 1) * this.tamanoPagina, this.paginaActual() * this.tamanoPagina));

  readonly cooperativaIdAutenticada = computed(() => {
    const usuario = this.auth.usuarioActual();
    const id = usuario?.cooperativaId;
    return usuario?.rol === 'COOPERATIVA' && typeof id === 'number' && Number.isSafeInteger(id) && id > 0 ? id : null;
  });
  puedeGestionar(): boolean {
    return this.auth.tieneRol('ADMIN') || (this.auth.tieneRol('COOPERATIVA') && this.cooperativaIdAutenticada() !== null);
  }
  private pertenece(cooperativaId: number): boolean {
    return this.puedeGestionar() && (this.auth.tieneRol('ADMIN') || cooperativaId === this.cooperativaIdAutenticada());
  }
  ngOnInit(): void { this.cargarFrecuencias(); this.cargarNombres(); }
  etiquetaFrecuencia(f: FrecuenciaDto): string {
    return `${this.cooperativasPorId().get(f.cooperativaId) ?? `Cooperativa #${f.cooperativaId}`} · ${this.rutasPorId().get(f.rutaId) ?? `Ruta #${f.rutaId}`} · ${f.codigo || `Frecuencia #${f.id}`} · ${f.horaSalida}${f.activa ? '' : ' (inactiva)'}`;
  }
  nombreParada(id: number): string {
    const parada = this.paradasPorId().get(id); return parada ? etiquetaParada(parada, this.lugares()) : `Parada #${id}`;
  }
  identificar(t: TarifaFrecuenciaDto): string { return `${this.nombreParada(t.origenRutaParadaId)} → ${this.nombreParada(t.destinoRutaParadaId)}`; }
  buscar(valor: string): void { this.busqueda.set(valor); this.pagina.set(1); }
  filtrarEstado(valor: string): void { this.filtroEstado.set(valor); this.pagina.set(1); }
  limpiarFiltros(): void { this.buscar(''); this.filtrarEstado(''); }
  cambiarPagina(delta: number): void { this.pagina.set(Math.max(1, Math.min(this.paginaActual() + delta, this.totalPaginas()))); }

  cargarFrecuencias(): void {
    if (!this.puedeGestionar() || this.cargandoFrecuencias() || this.seleccionBloqueada()) return;
    this.cargandoFrecuencias.set(true); this.errorFrecuencias.set(null);
    this.frecuenciaService.listar().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargandoFrecuencias.set(false))).subscribe({
      next: datos => {
        this.frecuencias.set(datos.filter(f => this.pertenece(f.cooperativaId)));
        if (this.frecuenciaId() !== null) this.seleccionarFrecuencia(this.frecuencias().some(f => f.id === this.frecuenciaId()) ? this.frecuenciaId() : null);
      }, error: (e: unknown) => this.errorFrecuencias.set(mensajeErrorTarifa(e))
    });
  }
  cargarNombres(): void {
    if (!this.puedeGestionar() || this.guardando() || this.desactivando()) return;
    const propia = this.cooperativaIdAutenticada();
    if (propia !== null) {
      this.cooperativas.set([{ id: propia, nombre: `Cooperativa #${propia}` }]);
      this.erroresNombres.update(c => ({ ...c, cooperativas: null }));
    } else this.cargarNombre('cooperativas', this.cooperativaService.listarCooperativas(), this.cooperativas);
    this.cargarNombre('rutas', this.rutaService.listar(), this.rutas);
    this.cargarNombre('lugares', this.lugarService.listar(), this.lugares);
  }
  private cargarNombre<T>(tipo: Catalogo, consulta: Observable<T[]>, destino: WritableSignal<T[]>): void {
    if (this.cargasNombres()[tipo]) return;
    this.cargasNombres.update(c => ({ ...c, [tipo]: true })); this.erroresNombres.update(c => ({ ...c, [tipo]: null }));
    consulta.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargasNombres.update(c => ({ ...c, [tipo]: false })))).subscribe({
      next: datos => destino.set(datos), error: (e: unknown) => this.erroresNombres.update(c => ({ ...c, [tipo]: `${tipo}: ${mensajeErrorTarifa(e)}` }))
    });
  }
  seleccionarDesdeControl(valor: string): void { this.seleccionarFrecuencia(valor === '' ? null : Number(valor)); }
  seleccionarFrecuencia(id: number | null): void {
    if (!this.puedeGestionar() || this.seleccionBloqueada()) return;
    if (id !== null && (!Number.isSafeInteger(id) || id <= 0 || !this.frecuencias().some(f => f.id === id && this.pertenece(f.cooperativaId)))) return;
    // Cancela lecturas del contexto anterior, incluidas consultas aún pendientes.
    this.contextoSub?.unsubscribe(); this.tarifasSub?.unsubscribe(); this.paradasSub?.unsubscribe(); this.detalleSub?.unsubscribe();
    this.frecuenciaId.set(id); this.contexto.set(null); this.tarifas.set([]); this.paradas.set([]); this.seleccionada.set(null);
    this.errorContexto.set(null); this.errorTarifas.set(null); this.errorParadas.set(null); this.exito.set(null); this.limpiarFiltros();
    if (id === null) return;
    this.cargandoContexto.set(true);
    this.contextoSub = this.frecuenciaService.obtener(id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargandoContexto.set(false))).subscribe({
      next: actual => {
        if (this.frecuenciaId() !== id) return;
        if (!this.pertenece(actual.cooperativaId)) { this.errorContexto.set('La frecuencia no pertenece a la cooperativa autorizada.'); return; }
        if (actual.id !== id || !Number.isSafeInteger(actual.rutaId) || actual.rutaId <= 0) { this.errorContexto.set('La frecuencia no identifica una ruta válida.'); return; }
        this.contexto.set(actual); this.cargarTarifas(); this.cargarParadas();
      }, error: (e: unknown) => this.errorContexto.set(mensajeErrorTarifa(e))
    });
  }
  cargarTarifas(): void {
    const contexto = this.contexto(); if (!this.puedeGestionar() || !contexto || !this.pertenece(contexto.cooperativaId) || this.seleccionBloqueada()) return;
    this.tarifasSub?.unsubscribe(); this.cargandoTarifas.set(true); this.errorTarifas.set(null);
    this.tarifasSub = this.servicio.listar(contexto.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargandoTarifas.set(false))).subscribe({
      next: datos => { if (this.contexto()?.id === contexto.id) this.tarifas.set(datos.filter(t => t.frecuenciaId === contexto.id)); },
      error: (e: unknown) => this.errorTarifas.set(mensajeErrorTarifa(e))
    });
  }
  cargarParadas(): void {
    const contexto = this.contexto(); if (!this.puedeGestionar() || !contexto || !this.pertenece(contexto.cooperativaId) || this.guardando() || this.desactivando()) return;
    this.paradasSub?.unsubscribe(); this.cargandoParadas.set(true); this.errorParadas.set(null);
    this.paradasSub = this.paradaService.listar(contexto.rutaId).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargandoParadas.set(false))).subscribe({
      next: datos => { if (this.contexto()?.id === contexto.id) this.paradas.set(paradasDeFrecuencia(datos, contexto)); },
      error: (e: unknown) => { this.paradas.set([]); this.errorParadas.set(`No se pudieron obtener las paradas de la ruta #${contexto.rutaId}. ${mensajeErrorTarifa(e)}`); }
    });
  }
  nueva(): void {
    if (!this.puedeGestionar() || !this.contexto() || !this.pertenece(this.contexto()!.cooperativaId) || !this.puedeCrear()) return;
    this.seleccionada.set(null); this.errorFormulario.set(null); this.exito.set(null); this.formularioVisible.set(true);
  }
  abrir(tarifa: TarifaFrecuenciaDto, modo: 'consultar' | 'editar'): void {
    const contexto = this.contexto();
    if (!this.puedeGestionar() || !contexto || !this.pertenece(contexto.cooperativaId) || tarifa.frecuenciaId !== contexto.id || this.ocupado() || this.panelAbierto() || (modo === 'editar' && !this.tramoDisponible())) return;
    this.cargandoDetalle.set(true); this.errorTarifas.set(null); this.exito.set(null);
    this.detalleSub = this.servicio.obtener(contexto.id, tarifa.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargandoDetalle.set(false))).subscribe({
      next: actual => {
        if (this.contexto()?.id !== contexto.id) return;
        if (actual.frecuenciaId !== contexto.id || actual.id !== tarifa.id) { this.errorTarifas.set('La tarifa no pertenece al contexto solicitado.'); return; }
        this.seleccionada.set(actual); this.errorFormulario.set(null); this.formularioVisible.set(modo === 'editar'); this.detalleVisible.set(modo === 'consultar');
      }, error: (e: unknown) => this.errorTarifas.set(mensajeErrorTarifa(e))
    });
  }
  cerrarPanel(): void {
    if (this.guardando()) return;
    this.formularioVisible.set(false); this.detalleVisible.set(false); this.seleccionada.set(null); this.errorFormulario.set(null);
  }
  guardar(evento: GuardarTarifa): void {
    const contexto = this.contexto(); const actual = this.seleccionada();
    if (!this.puedeGestionar() || !contexto || !this.pertenece(contexto.cooperativaId) || evento.frecuenciaId !== contexto.id || this.ocupado() || !this.formularioVisible() || !this.tramoDisponible()) return;
    if (evento.modo === 'editar' ? actual?.id !== evento.id || actual.frecuenciaId !== contexto.id || actual.activa !== evento.datos.activa : actual !== null || !contexto.activa) return;
    const origen = this.paradasPorId().get(evento.datos.origenRutaParadaId); const destino = this.paradasPorId().get(evento.datos.destinoRutaParadaId);
    if (!origen || !destino || origen.orden >= destino.orden) { this.errorFormulario.set('Selecciona un tramo válido de la ruta de esta frecuencia.'); return; }
    if (precioEnCentavos(String(evento.datos.precioBase)) === null) { this.errorFormulario.set('El precio debe estar entre 0 y 99.999.999,99 y tener como máximo dos decimales.'); return; }
    this.guardando.set(true); this.errorFormulario.set(null); this.exito.set(null);
    const solicitud = evento.modo === 'editar' ? this.servicio.actualizar(contexto.id, evento.id, evento.datos) : this.servicio.crear(contexto.id, evento.datos);
    solicitud.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.guardando.set(false))).subscribe({
      next: guardada => {
        if (guardada.frecuenciaId !== contexto.id) { this.errorFormulario.set('La respuesta no corresponde a la frecuencia seleccionada.'); return; }
        this.tarifas.update(filas => evento.modo === 'crear' ? [...filas, guardada] : filas.map(t => t.id === guardada.id ? guardada : t));
        this.guardando.set(false); this.cerrarPanel(); this.exito.set(evento.modo === 'crear' ? 'Tarifa registrada correctamente.' : 'Tarifa actualizada correctamente.'); this.cargarTarifas();
      }, error: (e: unknown) => this.errorFormulario.set(mensajeErrorTarifa(e))
    });
  }
  solicitarBaja(tarifa: TarifaFrecuenciaDto): void {
    if (!this.puedeGestionar() || !this.contexto() || !this.pertenece(this.contexto()!.cooperativaId) || tarifa.frecuenciaId !== this.contexto()?.id || !tarifa.activa || this.ocupado() || this.panelAbierto()) return;
    this.pendienteBaja.set(tarifa); this.errorBaja.set(null); this.exito.set(null); this.dialogo().nativeElement.showModal();
  }
  cancelarBaja(evento?: Event): void {
    evento?.preventDefault(); if (this.desactivando()) return;
    this.dialogo().nativeElement.close(); this.pendienteBaja.set(null); this.errorBaja.set(null);
  }
  confirmarBaja(): void {
    const actual = this.pendienteBaja(); const contexto = this.contexto();
    if (!actual || !contexto || actual.frecuenciaId !== contexto.id || !actual.activa || this.ocupado()) return;
    if (!this.pertenece(contexto.cooperativaId)) { this.errorBaja.set('Se requiere una sesión vigente y autorizada para esta cooperativa.'); return; }
    this.desactivando.set(true); this.errorBaja.set(null);
    this.servicio.darDeBaja(contexto.id, actual.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.desactivando.set(false))).subscribe({
      next: () => {
        this.tarifas.update(filas => filas.map(t => t.id === actual.id ? { ...t, activa: false } : t));
        this.desactivando.set(false); this.cancelarBaja(); this.exito.set('Tarifa desactivada correctamente.'); this.cargarTarifas();
      }, error: (e: unknown) => this.errorBaja.set(mensajeErrorTarifa(e))
    });
  }
}
