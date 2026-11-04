import { Component, DestroyRef, ElementRef, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { mensajeErrorLugar as mensajeErrorRuta } from '../lugares/lugar-error';
import { LugarDto } from '../lugares/lugar.model';
import { LugarService } from '../lugares/lugar.service';
import { GuardarRuta, RutaFormulario } from './ruta-formulario';
import { RutaDto } from './ruta.model';
import { RutaService } from './ruta.service';

@Component({
  selector: 'app-rutas-lista',
  standalone: true,
  imports: [RutaFormulario],
  templateUrl: './rutas-lista.html',
  styleUrl: './rutas-lista.css'
})
export class RutasLista implements OnInit {
  private readonly servicio = inject(RutaService);
  private readonly lugarService = inject(LugarService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogoBaja');

  readonly rutas = signal<RutaDto[]>([]);
  readonly lugares = signal<LugarDto[]>([]);
  readonly busqueda = signal('');
  readonly filtroEstado = signal('');
  readonly cargando = signal(false);
  readonly cargandoLugares = signal(false);
  readonly cargandoDetalle = signal(false);
  readonly guardando = signal(false);
  readonly desactivando = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorLugares = signal<string | null>(null);
  readonly errorFormulario = signal<string | null>(null);
  readonly errorBaja = signal<string | null>(null);
  readonly exito = signal<string | null>(null);
  readonly formularioVisible = signal(false);
  readonly seleccionada = signal<RutaDto | null>(null);
  readonly pendienteBaja = signal<RutaDto | null>(null);
  readonly ocupado = computed(() => this.cargando() || this.cargandoLugares() || this.cargandoDetalle() || this.guardando() || this.desactivando());
  readonly lugaresPorId = computed(() => new Map(this.lugares().map(lugar => [lugar.id, lugar])));
  readonly rutasFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLocaleLowerCase('es');
    return this.rutas().filter(ruta => ruta.nombre.toLocaleLowerCase('es').includes(texto) &&
      (this.filtroEstado() === '' || ruta.activa === (this.filtroEstado() === 'activa')));
  });

  puedeEscribir(): boolean {
    return this.auth.tieneRol('ADMIN');
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    if (this.ocupado() || this.pendienteBaja() !== null) return;
    this.error.set(null);
    this.cargando.set(true);
    this.servicio.listar().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargando.set(false))
    ).subscribe({
      next: rutas => this.rutas.set(rutas),
      error: (error: unknown) => this.error.set(mensajeErrorRuta(error))
    });
    // Las consultas son independientes: un fallo del catálogo no oculta las rutas.
    this.cargarLugares();
  }

  cargarLugares(): void {
    if (this.cargandoLugares() || this.guardando() || this.desactivando()) return;
    this.cargandoLugares.set(true);
    this.errorLugares.set(null);
    this.lugarService.listar().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargandoLugares.set(false))
    ).subscribe({
      next: lugares => this.lugares.set(lugares),
      error: (error: unknown) => this.errorLugares.set(mensajeErrorRuta(error))
    });
  }

  nombreLugar(id: number): string {
    return this.lugaresPorId().get(id)?.nombre ?? `Lugar #${id} (nombre no disponible)`;
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtroEstado.set('');
  }

  nueva(): void {
    if (!this.puedeEscribir() || this.ocupado() || this.formularioVisible() || this.pendienteBaja() !== null) return;
    this.seleccionada.set(null);
    this.errorFormulario.set(null);
    this.exito.set(null);
    this.formularioVisible.set(true);
  }

  editar(ruta: RutaDto): void {
    if (!this.puedeEscribir() || this.ocupado() || this.formularioVisible() || this.pendienteBaja() !== null) return;
    this.error.set(null);
    this.exito.set(null);
    this.cargandoDetalle.set(true);
    this.servicio.obtener(ruta.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargandoDetalle.set(false))
    ).subscribe({
      next: detalle => {
        this.seleccionada.set(detalle);
        this.errorFormulario.set(null);
        this.formularioVisible.set(true);
      },
      error: (error: unknown) => this.error.set(mensajeErrorRuta(error))
    });
  }

  cerrarFormulario(): void {
    if (this.guardando()) return;
    this.formularioVisible.set(false);
    this.seleccionada.set(null);
    this.errorFormulario.set(null);
  }

  guardar(evento: GuardarRuta): void {
    if (!this.puedeEscribir() || this.ocupado() || !this.formularioVisible() || this.errorLugares()) return;
    const seleccionada = this.seleccionada();
    if (evento.modo === 'editar' ? seleccionada?.id !== evento.id : seleccionada !== null) return;
    this.guardando.set(true);
    this.errorFormulario.set(null);
    this.exito.set(null);
    const solicitud = evento.modo === 'editar'
      ? this.servicio.actualizar(evento.id, evento.datos)
      : this.servicio.crear(evento.datos);
    solicitud.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarFormulario();
        this.exito.set(evento.modo === 'editar' ? 'Ruta actualizada correctamente.' : 'Ruta creada correctamente.');
        this.cargar();
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeErrorRuta(error));
      }
    });
  }

  solicitarBaja(ruta: RutaDto): void {
    if (!this.puedeEscribir() || this.ocupado() || this.formularioVisible() || !ruta.activa || this.pendienteBaja() !== null) return;
    this.pendienteBaja.set(ruta);
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
    const ruta = this.pendienteBaja();
    if (!ruta || !ruta.activa || this.ocupado()) return;
    if (!this.puedeEscribir()) {
      this.errorBaja.set('La escritura requiere una sesión vigente con rol ADMIN.');
      return;
    }
    this.desactivando.set(true);
    this.errorBaja.set(null);
    this.servicio.darDeBaja(ruta.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.desactivando.set(false);
        this.cancelarBaja();
        this.exito.set('Ruta desactivada correctamente.');
        this.cargar();
      },
      error: (error: unknown) => {
        this.desactivando.set(false);
        this.errorBaja.set(mensajeErrorRuta(error));
      }
    });
  }
}
