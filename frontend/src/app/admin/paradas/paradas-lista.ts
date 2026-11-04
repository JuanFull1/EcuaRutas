import { Component, DestroyRef, ElementRef, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, finalize } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { mensajeErrorLugar as mensajeErrorParada } from '../lugares/lugar-error';
import { LugarDto } from '../lugares/lugar.model';
import { LugarService } from '../lugares/lugar.service';
import { RutaDto } from '../rutas/ruta.model';
import { RutaService } from '../rutas/ruta.service';
import { GuardarParada, ParadaFormulario } from './parada-formulario';
import { RutaParadaDto } from './ruta-parada.model';
import { RutaParadaService } from './ruta-parada.service';

@Component({
  selector: 'app-paradas-lista',
  standalone: true,
  imports: [ParadaFormulario],
  templateUrl: './paradas-lista.html',
  styleUrl: './paradas-lista.css'
})
export class ParadasLista implements OnInit {
  private readonly servicio = inject(RutaParadaService);
  private readonly rutaService = inject(RutaService);
  private readonly lugarService = inject(LugarService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogoEliminar');
  private consultaParadas: Subscription | null = null;
  private consultaDetalle: Subscription | null = null;

  readonly rutas = signal<RutaDto[]>([]);
  readonly lugares = signal<LugarDto[]>([]);
  readonly rutaId = signal<number | null>(null);
  readonly rutaSeleccionada = computed(() => this.rutas().find(ruta => ruta.id === this.rutaId()) ?? null);
  readonly paradas = signal<RutaParadaDto[]>([]);
  readonly paradasOrdenadas = computed(() => [...this.paradas()].sort((a, b) => a.orden - b.orden || a.id - b.id));
  readonly lugaresPorId = computed(() => new Map(this.lugares().map(lugar => [lugar.id, lugar])));
  readonly cargandoRutas = signal(false);
  readonly cargandoLugares = signal(false);
  readonly cargando = signal(false);
  readonly cargandoDetalle = signal(false);
  readonly paradasConsultadas = signal(false);
  readonly guardando = signal(false);
  readonly eliminando = signal(false);
  readonly errorRutas = signal<string | null>(null);
  readonly errorLugares = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly errorFormulario = signal<string | null>(null);
  readonly errorEliminar = signal<string | null>(null);
  readonly exito = signal<string | null>(null);
  readonly formularioVisible = signal(false);
  readonly seleccionada = signal<RutaParadaDto | null>(null);
  readonly pendienteEliminar = signal<RutaParadaDto | null>(null);
  readonly ocupado = computed(() => this.cargandoRutas() || this.cargandoLugares() || this.cargando() || this.cargandoDetalle() || this.guardando() || this.eliminando());
  readonly seleccionBloqueada = computed(() => this.cargandoRutas() || this.guardando() || this.eliminando() || this.formularioVisible() || this.pendienteEliminar() !== null);

  puedeEscribir(): boolean {
    return this.auth.tieneRol('ADMIN');
  }

  ngOnInit(): void {
    this.actualizar();
  }

  actualizar(): void {
    if (this.ocupado() || this.formularioVisible() || this.pendienteEliminar() !== null) return;
    this.cargarRutas();
    this.cargarLugares();
  }

  cargarRutas(): void {
    if (this.cargandoRutas() || this.guardando() || this.eliminando() || this.formularioVisible() || this.pendienteEliminar() !== null) return;
    this.cargandoRutas.set(true);
    this.errorRutas.set(null);
    this.rutaService.listar().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargandoRutas.set(false))
    ).subscribe({
      next: rutas => {
        this.rutas.set(rutas);
        if (this.rutaId() !== null && this.rutaSeleccionada() === null) this.establecerRuta(null);
        else if (this.rutaId() !== null) this.cargarParadas();
      },
      error: (error: unknown) => this.errorRutas.set(mensajeErrorParada(error))
    });
  }

  cargarLugares(): void {
    if (this.cargandoLugares() || this.guardando() || this.eliminando()) return;
    this.cargandoLugares.set(true);
    this.errorLugares.set(null);
    this.lugarService.listar().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargandoLugares.set(false))
    ).subscribe({
      next: lugares => this.lugares.set(lugares),
      error: (error: unknown) => this.errorLugares.set(mensajeErrorParada(error))
    });
  }

  cambiarRuta(valor: string): void {
    this.seleccionarRuta(valor === '' ? null : Number(valor));
  }

  seleccionarRuta(id: number | null): void {
    if (this.seleccionBloqueada() || id === this.rutaId()) return;
    if (id !== null && !this.rutas().some(ruta => ruta.id === id)) return;
    this.establecerRuta(id);
    if (id !== null) this.cargarParadas();
  }

  private establecerRuta(id: number | null): void {
    // Cancela antes de activar el nuevo estado: un finalize anterior no debe apagar su indicador de carga.
    this.consultaParadas?.unsubscribe();
    this.consultaDetalle?.unsubscribe();
    this.rutaId.set(id);
    this.paradas.set([]);
    this.paradasConsultadas.set(false);
    this.seleccionada.set(null);
    this.formularioVisible.set(false);
    this.error.set(null);
    this.errorFormulario.set(null);
    this.exito.set(null);
  }

  cargarParadas(): void {
    const rutaId = this.rutaSeleccionada()?.id;
    if (rutaId === undefined || this.cargando() || this.cargandoDetalle() || this.guardando() || this.eliminando() || this.formularioVisible() || this.pendienteEliminar() !== null) return;
    this.error.set(null);
    this.paradas.set([]);
    this.paradasConsultadas.set(false);
    this.cargando.set(true);
    this.consultaParadas = this.servicio.listar(rutaId).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargando.set(false))
    ).subscribe({
      next: paradas => {
        if (this.rutaId() !== rutaId) return;
        this.paradas.set(paradas);
        this.paradasConsultadas.set(true);
      },
      error: (error: unknown) => {
        if (this.rutaId() === rutaId) this.error.set(mensajeErrorParada(error));
      }
    });
  }

  nombreLugar(id: number): string {
    return this.lugaresPorId().get(id)?.nombre ?? `Lugar #${id} (nombre no disponible)`;
  }

  agregar(): void {
    if (!this.puedeEscribir() || !this.rutaSeleccionada() || !this.paradasConsultadas() || this.ocupado() || this.formularioVisible() || this.pendienteEliminar() !== null) return;
    this.seleccionada.set(null);
    this.errorFormulario.set(null);
    this.exito.set(null);
    this.formularioVisible.set(true);
  }

  editar(parada: RutaParadaDto): void {
    const rutaId = this.rutaSeleccionada()?.id;
    if (!this.puedeEscribir() || rutaId === undefined || parada.rutaId !== rutaId || !this.paradasConsultadas() || this.ocupado() || this.formularioVisible() || this.pendienteEliminar() !== null) return;
    this.error.set(null);
    this.exito.set(null);
    this.cargandoDetalle.set(true);
    this.consultaDetalle = this.servicio.obtener(rutaId, parada.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargandoDetalle.set(false))
    ).subscribe({
      next: detalle => {
        if (this.rutaId() !== rutaId) return;
        if (detalle.rutaId !== rutaId || detalle.id !== parada.id) {
          this.error.set('Los datos recibidos no corresponden a la parada seleccionada. Actualiza el listado.');
          return;
        }
        this.seleccionada.set(detalle);
        this.errorFormulario.set(null);
        this.formularioVisible.set(true);
      },
      error: (error: unknown) => {
        if (this.rutaId() === rutaId) this.error.set(mensajeErrorParada(error));
      }
    });
  }

  cerrarFormulario(): void {
    if (this.guardando()) return;
    this.formularioVisible.set(false);
    this.seleccionada.set(null);
    this.errorFormulario.set(null);
  }

  guardar(evento: GuardarParada): void {
    if (!this.puedeEscribir() || !this.rutaSeleccionada() || this.ocupado() || !this.formularioVisible() || this.errorLugares() || evento.rutaId !== this.rutaId()) return;
    const seleccionada = this.seleccionada();
    if (evento.modo === 'editar'
      ? seleccionada?.id !== evento.id || seleccionada?.rutaId !== evento.rutaId
      : seleccionada !== null) return;
    this.guardando.set(true);
    this.errorFormulario.set(null);
    this.exito.set(null);
    const solicitud = evento.modo === 'editar'
      ? this.servicio.actualizar(evento.rutaId, evento.id, evento.datos)
      : this.servicio.crear(evento.rutaId, evento.datos);
    solicitud.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarFormulario();
        this.exito.set(evento.modo === 'editar' ? 'Parada actualizada correctamente.' : 'Parada agregada correctamente.');
        this.cargarParadas();
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeErrorParada(error));
      }
    });
  }

  solicitarEliminar(parada: RutaParadaDto): void {
    if (!this.puedeEscribir() || !this.rutaSeleccionada() || parada.rutaId !== this.rutaId() || this.ocupado() || this.formularioVisible() || this.pendienteEliminar() !== null) return;
    this.pendienteEliminar.set(parada);
    this.errorEliminar.set(null);
    this.exito.set(null);
    this.dialogo().nativeElement.showModal();
  }

  cancelarEliminar(evento?: Event): void {
    evento?.preventDefault();
    if (this.eliminando()) return;
    this.dialogo().nativeElement.close();
    this.pendienteEliminar.set(null);
    this.errorEliminar.set(null);
  }

  confirmarEliminar(): void {
    const parada = this.pendienteEliminar();
    if (!parada || parada.rutaId !== this.rutaSeleccionada()?.id || this.ocupado()) return;
    if (!this.puedeEscribir()) {
      this.errorEliminar.set('La escritura requiere una sesión vigente con rol ADMIN.');
      return;
    }
    this.eliminando.set(true);
    this.errorEliminar.set(null);
    this.servicio.eliminar(parada.rutaId, parada.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.cancelarEliminar();
        this.exito.set('Parada eliminada correctamente.');
        this.cargarParadas();
      },
      error: (error: unknown) => {
        this.eliminando.set(false);
        this.errorEliminar.set(mensajeErrorParada(error));
      }
    });
  }
}
