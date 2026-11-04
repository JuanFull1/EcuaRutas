import { Component, DestroyRef, ElementRef, OnInit, WritableSignal, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, map } from 'rxjs';
import { CooperativaResumen } from '../../models/admin-usuario.model';
import { AuthService } from '../../services/auth.service';
import { UsuariosAdminService } from '../../services/usuarios-admin.service';
import { RutaDto } from '../rutas/ruta.model';
import { RutaService } from '../rutas/ruta.service';
import { ResolucionAntDto } from '../resoluciones-ant/resolucion-ant.model';
import { ResolucionAntService } from '../resoluciones-ant/resolucion-ant.service';
import { mensajeErrorFrecuencia } from './frecuencia-error';
import { FrecuenciaFormulario, GuardarFrecuencia } from './frecuencia-formulario';
import { FrecuenciaDto, cambiaEstructura } from './frecuencia.model';
import { FrecuenciaService } from './frecuencia.service';

type Catalogo = 'cooperativas' | 'rutas' | 'resoluciones';

@Component({
  selector: 'app-frecuencias-lista', standalone: true, imports: [FrecuenciaFormulario],
  templateUrl: './frecuencias-lista.html', styleUrl: './frecuencias-lista.css'
})
export class FrecuenciasLista implements OnInit {
  private readonly servicio = inject(FrecuenciaService);
  private readonly cooperativaService = inject(UsuariosAdminService);
  private readonly rutaService = inject(RutaService);
  private readonly resolucionService = inject(ResolucionAntService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogoBaja');
  readonly frecuencias = signal<FrecuenciaDto[]>([]);
  readonly cooperativas = signal<CooperativaResumen[]>([]);
  readonly rutas = signal<RutaDto[]>([]);
  readonly resoluciones = signal<ResolucionAntDto[]>([]);
  readonly cargando = signal(false);
  readonly cargandoDetalle = signal(false);
  readonly guardando = signal(false);
  readonly desactivando = signal(false);
  readonly cargasCatalogos = signal<Record<Catalogo, boolean>>({ cooperativas: false, rutas: false, resoluciones: false });
  readonly fallosCatalogos = signal<Record<Catalogo, string | null>>({ cooperativas: null, rutas: null, resoluciones: null });
  readonly cargandoCatalogos = computed(() => Object.values(this.cargasCatalogos()).some(Boolean));
  readonly erroresCatalogos = computed(() => Object.values(this.fallosCatalogos()).filter((e): e is string => e !== null));
  readonly error = signal<string | null>(null);
  readonly errorFormulario = signal<string | null>(null);
  readonly errorBaja = signal<string | null>(null);
  readonly exito = signal<string | null>(null);
  readonly formularioVisible = signal(false);
  readonly detalleVisible = signal(false);
  readonly seleccionada = signal<FrecuenciaDto | null>(null);
  readonly pendienteBaja = signal<FrecuenciaDto | null>(null);
  readonly busqueda = signal('');
  readonly filtroCooperativa = signal('');
  readonly filtroEstado = signal('');
  readonly pagina = signal(1);
  readonly tamanoPagina = 10;
  readonly ocupado = computed(() => this.cargando() || this.cargandoDetalle() || this.guardando() || this.desactivando());
  readonly panelAbierto = computed(() => this.formularioVisible() || this.detalleVisible() || this.pendienteBaja() !== null);
  private readonly nombresCooperativas = computed(() => new Map(this.cooperativas().map(c => [c.id, c.nombre])));
  private readonly nombresRutas = computed(() => new Map(this.rutas().map(r => [r.id, r.nombre])));
  private readonly numerosResoluciones = computed(() => new Map(this.resoluciones().map(r => [r.id, r.numeroResolucion])));
  readonly cooperativasFiltro = computed(() => {
    const mapa = new Map(this.cooperativas().map(c => [c.id, c]));
    for (const f of this.frecuencias()) if (!mapa.has(f.cooperativaId)) mapa.set(f.cooperativaId, { id: f.cooperativaId, nombre: `Cooperativa #${f.cooperativaId}` });
    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  });
  readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLocaleLowerCase('es');
    return this.frecuencias().filter(f => `${f.codigo ?? ''} ${this.nombreCooperativa(f.cooperativaId)} ${this.nombreRuta(f.rutaId)} ${this.numeroResolucion(f.resolucionAntId)} ${f.horaSalida} #${f.id}`.toLocaleLowerCase('es').includes(texto) &&
      (this.filtroCooperativa() === '' || String(f.cooperativaId) === this.filtroCooperativa()) &&
      (this.filtroEstado() === '' || f.activa === (this.filtroEstado() === 'activa')));
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
  ngOnInit(): void { this.cargar(); }
  nombreCooperativa(id: number): string { return this.nombresCooperativas().get(id) ?? `Cooperativa #${id}`; }
  nombreRuta(id: number): string { return this.nombresRutas().get(id) ?? `Ruta #${id}`; }
  numeroResolucion(id: number): string { return this.numerosResoluciones().get(id) ?? `Resolución #${id}`; }
  identificar(f: FrecuenciaDto): string { return `${f.codigo || `Frecuencia #${f.id}`} · ${this.nombreRuta(f.rutaId)} · ${f.horaSalida}`; }
  buscar(valor: string): void { this.busqueda.set(valor); this.pagina.set(1); }
  filtrarCooperativa(valor: string): void { this.filtroCooperativa.set(this.cooperativaIdAutenticada()?.toString() ?? valor); this.pagina.set(1); }
  filtrarEstado(valor: string): void { this.filtroEstado.set(valor); this.pagina.set(1); }
  limpiarFiltros(): void { this.buscar(''); this.filtrarCooperativa(''); this.filtrarEstado(''); }
  cambiarPagina(delta: number): void { this.pagina.set(Math.max(1, Math.min(this.paginaActual() + delta, this.totalPaginas()))); }

  cargar(): void {
    if (!this.puedeGestionar() || this.ocupado() || this.panelAbierto()) return;
    this.error.set(null); this.cargando.set(true);
    this.servicio.listar().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargando.set(false))).subscribe({
      next: datos => this.frecuencias.set(datos.filter(f => this.pertenece(f.cooperativaId))), error: (e: unknown) => this.error.set(mensajeErrorFrecuencia(e))
    });
    this.cargarCatalogos();
  }
  cargarCatalogos(): void {
    if (!this.puedeGestionar() || this.guardando() || this.desactivando()) return;
    const propia = this.cooperativaIdAutenticada();
    if (propia !== null) {
      this.cooperativas.set([{ id: propia, nombre: `Cooperativa #${propia}` }]);
      this.fallosCatalogos.update(c => ({ ...c, cooperativas: null }));
    } else this.cargarCatalogo('cooperativas', this.cooperativaService.listarCooperativas(), this.cooperativas);
    this.cargarCatalogo('rutas', this.rutaService.listar(), this.rutas);
    this.cargarCatalogo('resoluciones', this.resolucionService.listar().pipe(map(datos => datos.filter(r => this.pertenece(r.cooperativaId)))), this.resoluciones);
  }
  private cargarCatalogo<T>(tipo: Catalogo, solicitud: Observable<T[]>, destino: WritableSignal<T[]>): void {
    if (this.cargasCatalogos()[tipo]) return;
    this.cargasCatalogos.update(c => ({ ...c, [tipo]: true }));
    this.fallosCatalogos.update(c => ({ ...c, [tipo]: null }));
    solicitud.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargasCatalogos.update(c => ({ ...c, [tipo]: false })))).subscribe({
      next: datos => destino.set(datos), error: (e: unknown) => this.fallosCatalogos.update(c => ({ ...c, [tipo]: `${tipo}: ${mensajeErrorFrecuencia(e)}` }))
    });
  }
  nueva(): void {
    if (!this.puedeGestionar() || this.ocupado() || this.panelAbierto()) return;
    this.seleccionada.set(null); this.errorFormulario.set(null); this.exito.set(null); this.formularioVisible.set(true);
  }
  abrir(frecuencia: FrecuenciaDto, modo: 'consultar' | 'editar'): void {
    if (!this.pertenece(frecuencia.cooperativaId) || this.ocupado() || this.panelAbierto()) return;
    this.error.set(null); this.exito.set(null); this.cargandoDetalle.set(true);
    this.servicio.obtener(frecuencia.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargandoDetalle.set(false))).subscribe({
      next: actual => { if (!this.pertenece(actual.cooperativaId)) { this.error.set('La frecuencia no pertenece a la cooperativa autorizada.'); return; } this.seleccionada.set(actual); this.errorFormulario.set(null); this.formularioVisible.set(modo === 'editar'); this.detalleVisible.set(modo === 'consultar'); },
      error: (e: unknown) => this.error.set(mensajeErrorFrecuencia(e))
    });
  }
  cerrarPanel(): void {
    if (this.guardando()) return;
    this.seleccionada.set(null); this.formularioVisible.set(false); this.detalleVisible.set(false); this.errorFormulario.set(null);
  }
  guardar(evento: GuardarFrecuencia): void {
    if (!this.puedeGestionar() || this.ocupado() || this.cargandoCatalogos() || !this.formularioVisible()) return;
    if (!this.pertenece(evento.datos.cooperativaId)) { this.errorFormulario.set('La cooperativa no corresponde a la sesión autenticada.'); return; }
    const actual = this.seleccionada();
    if (actual && !this.pertenece(actual.cooperativaId)) return;
    if (evento.modo === 'editar' ? actual?.id !== evento.id || actual.activa !== evento.datos.activa : actual !== null) return;
    if (this.erroresCatalogos().length && (!actual || cambiaEstructura(actual, evento.datos))) return;
    const resolucion = this.resoluciones().find(r => r.id === evento.datos.resolucionAntId);
    if (resolucion && resolucion.cooperativaId !== evento.datos.cooperativaId) {
      this.errorFormulario.set('La resolución ANT debe pertenecer a la cooperativa seleccionada.'); return;
    }
    this.guardando.set(true); this.errorFormulario.set(null); this.exito.set(null);
    const solicitud = evento.modo === 'editar' ? this.servicio.actualizar(evento.id, evento.datos) : this.servicio.crear(evento.datos);
    solicitud.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.guardando.set(false))).subscribe({
      next: guardada => {
        this.frecuencias.update(filas => evento.modo === 'crear' ? [...filas, guardada] : filas.map(f => f.id === guardada.id ? guardada : f));
        this.guardando.set(false); this.cerrarPanel();
        this.exito.set(evento.modo === 'crear' ? 'Frecuencia registrada correctamente.' : 'Frecuencia actualizada correctamente.'); this.cargar();
      }, error: (e: unknown) => this.errorFormulario.set(mensajeErrorFrecuencia(e))
    });
  }
  solicitarBaja(frecuencia: FrecuenciaDto): void {
    if (!this.pertenece(frecuencia.cooperativaId) || this.ocupado() || this.panelAbierto() || !frecuencia.activa) return;
    this.pendienteBaja.set(frecuencia); this.errorBaja.set(null); this.exito.set(null); this.dialogo().nativeElement.showModal();
  }
  cancelarBaja(evento?: Event): void {
    evento?.preventDefault(); if (this.desactivando()) return;
    this.dialogo().nativeElement.close(); this.pendienteBaja.set(null); this.errorBaja.set(null);
  }
  confirmarBaja(): void {
    const actual = this.pendienteBaja(); if (!actual || !actual.activa || this.ocupado()) return;
    if (!this.pertenece(actual.cooperativaId)) { this.errorBaja.set('Se requiere una sesión vigente y autorizada para esta cooperativa.'); return; }
    this.desactivando.set(true); this.errorBaja.set(null);
    this.servicio.darDeBaja(actual.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.desactivando.set(false))).subscribe({
      next: () => {
        this.frecuencias.update(filas => filas.map(f => f.id === actual.id ? { ...f, activa: false } : f));
        this.desactivando.set(false); this.cancelarBaja(); this.exito.set('Frecuencia desactivada correctamente.'); this.cargar();
      }, error: (e: unknown) => this.errorBaja.set(mensajeErrorFrecuencia(e))
    });
  }
}
