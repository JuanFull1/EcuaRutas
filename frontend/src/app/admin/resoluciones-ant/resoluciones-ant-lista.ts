import { Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { CooperativaResumen } from '../../models/admin-usuario.model';
import { AuthService } from '../../services/auth.service';
import { UsuariosAdminService } from '../../services/usuarios-admin.service';
import { enlaceDocumento, mensajeErrorResolucion } from './resolucion-ant-error';
import { GuardarResolucionAnt, ResolucionAntFormulario } from './resolucion-ant-formulario';
import { ResolucionAntDto } from './resolucion-ant.model';
import { ResolucionAntService } from './resolucion-ant.service';

@Component({
  selector: 'app-resoluciones-ant-lista',
  standalone: true,
  imports: [ResolucionAntFormulario],
  templateUrl: './resoluciones-ant-lista.html',
  styleUrl: './resoluciones-ant-lista.css'
})
export class ResolucionesAntLista implements OnInit {
  private readonly servicio = inject(ResolucionAntService);
  private readonly catalogo = inject(UsuariosAdminService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogoBaja');

  readonly resoluciones = signal<ResolucionAntDto[]>([]);
  readonly cooperativas = signal<CooperativaResumen[]>([]);
  readonly cargando = signal(false);
  readonly cargandoCooperativas = signal(false);
  readonly cargandoDetalle = signal(false);
  readonly guardando = signal(false);
  readonly desactivando = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorCooperativas = signal<string | null>(null);
  readonly errorFormulario = signal<string | null>(null);
  readonly errorBaja = signal<string | null>(null);
  readonly exito = signal<string | null>(null);
  readonly formularioVisible = signal(false);
  readonly detalleVisible = signal(false);
  readonly seleccionada = signal<ResolucionAntDto | null>(null);
  readonly pendienteBaja = signal<ResolucionAntDto | null>(null);
  readonly busqueda = signal('');
  readonly filtroEstado = signal('');
  readonly pagina = signal(1);
  readonly tamanoPagina = 10;
  readonly enlaceDocumento = enlaceDocumento;

  readonly ocupado = computed(() => this.cargando() || this.cargandoDetalle() || this.guardando() || this.desactivando());
  readonly panelAbierto = computed(() => this.formularioVisible() || this.detalleVisible() || this.pendienteBaja() !== null);
  readonly cooperativasPorId = computed(() => new Map(this.cooperativas().map(c => [c.id, c.nombre])));
  readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLocaleLowerCase('es');
    return this.resoluciones().filter(r =>
      `${r.numeroResolucion} ${this.nombreCooperativa(r.cooperativaId)} ${r.cooperativaId}`.toLocaleLowerCase('es').includes(texto) &&
      (this.filtroEstado() === '' || r.activa === (this.filtroEstado() === 'activa')));
  });
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtradas().length / this.tamanoPagina)));
  readonly paginaActual = computed(() => Math.max(1, Math.min(this.pagina(), this.totalPaginas())));
  readonly filasPagina = computed(() => this.filtradas().slice((this.paginaActual() - 1) * this.tamanoPagina, this.paginaActual() * this.tamanoPagina));

  puedeGestionar(): boolean { return this.auth.tieneRol('ADMIN'); }

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    if (!this.puedeGestionar() || this.ocupado() || this.panelAbierto()) return;
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listar().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargando.set(false))).subscribe({
      next: datos => this.resoluciones.set(datos),
      error: (error: unknown) => this.error.set(mensajeErrorResolucion(error))
    });
    // Un fallo del catálogo no oculta resoluciones ni altera sus identificadores.
    this.cargarCooperativas();
  }

  cargarCooperativas(): void {
    if (!this.puedeGestionar() || this.cargandoCooperativas() || this.guardando() || this.desactivando()) return;
    this.cargandoCooperativas.set(true);
    this.errorCooperativas.set(null);
    this.catalogo.listarCooperativas().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargandoCooperativas.set(false))).subscribe({
      next: datos => this.cooperativas.set(datos),
      error: (error: unknown) => this.errorCooperativas.set(mensajeErrorResolucion(error))
    });
  }

  nombreCooperativa(id: number): string { return this.cooperativasPorId().get(id) ?? `Cooperativa #${id} (nombre no disponible)`; }
  buscar(valor: string): void { this.busqueda.set(valor); this.pagina.set(1); }
  filtrarEstado(valor: string): void { this.filtroEstado.set(valor); this.pagina.set(1); }
  limpiarFiltros(): void { this.buscar(''); this.filtrarEstado(''); }
  cambiarPagina(desplazamiento: number): void { this.pagina.set(Math.max(1, Math.min(this.paginaActual() + desplazamiento, this.totalPaginas()))); }

  nueva(): void {
    if (!this.puedeGestionar() || this.ocupado() || this.panelAbierto()) return;
    this.seleccionada.set(null);
    this.errorFormulario.set(null);
    this.exito.set(null);
    this.formularioVisible.set(true);
  }

  abrir(resolucion: ResolucionAntDto, modo: 'consultar' | 'editar'): void {
    if (!this.puedeGestionar() || this.ocupado() || this.panelAbierto()) return;
    this.cargandoDetalle.set(true);
    this.error.set(null);
    this.exito.set(null);
    this.servicio.obtener(resolucion.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargandoDetalle.set(false))).subscribe({
      next: actual => {
        this.seleccionada.set(actual);
        this.errorFormulario.set(null);
        this.formularioVisible.set(modo === 'editar');
        this.detalleVisible.set(modo === 'consultar');
      },
      error: (error: unknown) => this.error.set(mensajeErrorResolucion(error))
    });
  }

  cerrarPanel(): void {
    if (this.guardando()) return;
    this.formularioVisible.set(false);
    this.detalleVisible.set(false);
    this.seleccionada.set(null);
    this.errorFormulario.set(null);
  }

  guardar(evento: GuardarResolucionAnt): void {
    if (!this.puedeGestionar() || this.ocupado() || this.cargandoCooperativas() || !this.formularioVisible()) return;
    const actual = this.seleccionada();
    if (evento.modo === 'editar') {
      if (actual?.id !== evento.id || actual.activa !== evento.datos.activa) return;
    } else if (actual !== null || this.errorCooperativas()) return;
    this.guardando.set(true);
    this.errorFormulario.set(null);
    this.exito.set(null);
    const solicitud = evento.modo === 'editar'
      ? this.servicio.actualizar(evento.id, evento.datos) : this.servicio.crear(evento.datos);
    solicitud.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.guardando.set(false))).subscribe({
      next: guardada => {
        // Conserva el resultado incluso si la recarga posterior falla.
        this.resoluciones.update(filas => evento.modo === 'crear' ? [...filas, guardada] : filas.map(r => r.id === guardada.id ? guardada : r));
        this.guardando.set(false);
        this.cerrarPanel();
        this.exito.set(evento.modo === 'editar' ? 'Resolución actualizada correctamente.' : 'Resolución registrada correctamente.');
        this.cargar();
      },
      error: (error: unknown) => this.errorFormulario.set(mensajeErrorResolucion(error))
    });
  }

  solicitarBaja(resolucion: ResolucionAntDto): void {
    if (!this.puedeGestionar() || this.ocupado() || this.panelAbierto() || !resolucion.activa) return;
    this.pendienteBaja.set(resolucion);
    this.errorBaja.set(null);
    this.exito.set(null);
    this.dialogo().nativeElement.showModal();
  }

  cancelarBaja(evento?: Event): void {
    evento?.preventDefault();
    if (this.desactivando()) return;
    this.dialogo().nativeElement.close();
    this.pendienteBaja.set(null);
    this.errorBaja.set(null);
  }

  confirmarBaja(): void {
    const actual = this.pendienteBaja();
    if (!actual || !actual.activa || this.ocupado()) return;
    if (!this.puedeGestionar()) { this.errorBaja.set('Se requiere una sesión vigente con rol ADMIN.'); return; }
    this.desactivando.set(true);
    this.errorBaja.set(null);
    this.servicio.darDeBaja(actual.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.desactivando.set(false))).subscribe({
      next: () => {
        this.resoluciones.update(filas => filas.map(r => r.id === actual.id ? { ...r, activa: false } : r));
        this.desactivando.set(false);
        this.cancelarBaja();
        this.exito.set('Resolución desactivada correctamente.');
        this.cargar();
      },
      error: (error: unknown) => this.errorBaja.set(mensajeErrorResolucion(error))
    });
  }
}
