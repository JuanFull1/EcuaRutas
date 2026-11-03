import { Component, DestroyRef, ElementRef, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { mensajeErrorLugar } from './lugar-error';
import { GuardarLugar, LugarFormulario } from './lugar-formulario';
import { LugarDto } from './lugar.model';
import { LugarService } from './lugar.service';

@Component({
  selector: 'app-lugares-lista',
  standalone: true,
  imports: [LugarFormulario],
  templateUrl: './lugares-lista.html',
  styleUrl: './lugares-lista.css'
})
export class LugaresLista implements OnInit {
  private readonly servicio = inject(LugarService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogoBaja');

  readonly lugares = signal<LugarDto[]>([]);
  readonly busqueda = signal('');
  readonly filtroEstado = signal('');
  readonly cargando = signal(false);
  readonly cargandoDetalle = signal(false);
  readonly guardando = signal(false);
  readonly desactivando = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorFormulario = signal<string | null>(null);
  readonly errorBaja = signal<string | null>(null);
  readonly exito = signal<string | null>(null);
  readonly formularioVisible = signal(false);
  readonly seleccionado = signal<LugarDto | null>(null);
  readonly pendienteBaja = signal<LugarDto | null>(null);
  readonly ocupado = computed(() => this.cargando() || this.cargandoDetalle() || this.guardando() || this.desactivando());
  readonly lugaresFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLocaleLowerCase('es');
    return this.lugares().filter(lugar =>
      lugar.nombre.toLocaleLowerCase('es').includes(texto) &&
      (this.filtroEstado() === '' || lugar.activo === (this.filtroEstado() === 'activo')));
  });

  // Reutiliza la comprobación de rol y vigencia de sesión del proyecto.
  puedeEscribir(): boolean {
    return this.auth.tieneRol('ADMIN');
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    if (this.ocupado()) return;
    this.error.set(null);
    this.cargando.set(true);
    this.servicio.listar().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargando.set(false))
    ).subscribe({
      next: lugares => this.lugares.set(lugares),
      error: (error: unknown) => this.error.set(mensajeErrorLugar(error))
    });
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtroEstado.set('');
  }

  nuevo(): void {
    if (!this.puedeEscribir() || this.ocupado() || this.formularioVisible()) return;
    this.seleccionado.set(null);
    this.errorFormulario.set(null);
    this.exito.set(null);
    this.formularioVisible.set(true);
  }

  editar(lugar: LugarDto): void {
    if (!this.puedeEscribir() || this.ocupado() || this.formularioVisible()) return;
    this.error.set(null);
    this.exito.set(null);
    this.cargandoDetalle.set(true);
    this.servicio.obtener(lugar.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargandoDetalle.set(false))
    ).subscribe({
      next: detalle => {
        this.seleccionado.set(detalle);
        this.errorFormulario.set(null);
        this.formularioVisible.set(true);
      },
      error: (error: unknown) => this.error.set(mensajeErrorLugar(error))
    });
  }

  cerrarFormulario(): void {
    if (this.guardando()) return;
    this.formularioVisible.set(false);
    this.seleccionado.set(null);
    this.errorFormulario.set(null);
  }

  guardar(evento: GuardarLugar): void {
    if (!this.puedeEscribir() || this.ocupado() || !this.formularioVisible()) return;
    const seleccionado = this.seleccionado();
    // El modo y el ID deben corresponder al formulario abierto: nunca convertir una edición en POST.
    if (evento.modo === 'editar' ? seleccionado?.id !== evento.id : seleccionado !== null) return;
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
        this.exito.set(evento.modo === 'editar' ? 'Lugar actualizado correctamente.' : 'Lugar creado correctamente.');
        this.cargar();
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeErrorLugar(error));
      }
    });
  }

  solicitarBaja(lugar: LugarDto): void {
    if (!this.puedeEscribir() || this.ocupado() || this.formularioVisible() || !lugar.activo) return;
    this.pendienteBaja.set(lugar);
    this.errorBaja.set(null);
    this.exito.set(null);
    this.dialogo().nativeElement.showModal();
  }

  cancelarBaja(evento?: Event): void {
    if (this.desactivando()) {
      evento?.preventDefault();
      return;
    }
    this.dialogo().nativeElement.close();
    this.pendienteBaja.set(null);
    this.errorBaja.set(null);
  }

  confirmarBaja(): void {
    const lugar = this.pendienteBaja();
    if (!lugar || !lugar.activo || this.ocupado()) return;
    if (!this.puedeEscribir()) {
      this.errorBaja.set('La escritura requiere una sesión vigente con rol ADMIN.');
      return;
    }
    this.desactivando.set(true);
    this.errorBaja.set(null);
    this.servicio.darDeBaja(lugar.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.desactivando.set(false);
        this.cancelarBaja();
        this.exito.set('Lugar desactivado correctamente.');
        this.cargar();
      },
      error: (error: unknown) => {
        this.desactivando.set(false);
        this.errorBaja.set(mensajeErrorLugar(error));
      }
    });
  }
}
