
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  inject,
  viewChild
} from '@angular/core';

import {
  CommonModule,
  DatePipe,
  DecimalPipe
} from '@angular/common';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  ClienteApiService,
  LugarCliente,
  ViajeCliente,
  AsientoDisponibleCliente,
  ReservaClienteResponse
} from '../../services/cliente-api.service';

@Component({
  selector: 'app-buscar-viajes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe
  ],
  templateUrl: './buscar-viajes.html',
  styleUrl: './buscar-viajes.css'
})
export class BuscarViajes implements OnInit {

  private readonly clienteApi = inject(ClienteApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly dialogoReserva = viewChild.required<ElementRef<HTMLDialogElement>>('dialogoReserva');

  lugares: LugarCliente[] = [];
  viajes: ViajeCliente[] = [];

  origenLugarId: number | null = null;
  destinoLugarId: number | null = null;

  fecha = '';

  cooperativaFiltro = '';
  precioMaximo: number | null = null;

  cargandoLugares = false;
  buscando = false;
  busquedaRealizada = false;

  error = '';
  viajeSeleccionado: ViajeCliente | null = null;
  asientosDisponibles: AsientoDisponibleCliente[] = [];
  asientoSeleccionadoId: number | null = null;
  documento = '';
  documentoDesdePerfil = false;
  cargandoAsientos = false;
  reservando = false;
  errorReserva = '';
  reservaCreada: ReservaClienteResponse | null = null;

  ngOnInit(): void {
    this.cargarLugares();
    this.clienteApi.obtenerCedulaCliente().subscribe({
      next: perfil => {
        const cedulaPerfil = perfil.cedula?.trim() ?? '';
        this.documentoDesdePerfil = /^\d{10}$/.test(cedulaPerfil);
        this.documento = this.documentoDesdePerfil ? cedulaPerfil : '';
        this.cdr.markForCheck();
      },
      error: () => {
        // Si la cuenta no tiene cédula todavía, se podrá ingresar en el formulario de reserva.
      }
    });
  }

  cargarLugares(): void {
    this.cargandoLugares = true;

    this.clienteApi.obtenerLugares().subscribe({
      next: (lugares) => {
        this.lugares = lugares;
        this.cargandoLugares = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudieron cargar los destinos.';
        this.cargandoLugares = false;
        this.cdr.markForCheck();
      }
    });
  }

  buscarViajes(): void {

    this.error = '';

    if (!this.origenLugarId ||
        !this.destinoLugarId ||
        !this.fecha) {
      this.error =
        'Seleccione origen, destino y fecha.';
      return;
    }

    if (this.origenLugarId === this.destinoLugarId) {
      this.error =
        'El origen y destino deben ser diferentes.';
      return;
    }

    this.buscando = true;
    this.busquedaRealizada = false;
    this.viajes = [];

    this.clienteApi.buscarViajes(
      this.origenLugarId,
      this.destinoLugarId,
      this.fecha
    ).subscribe({
      next: (viajes) => {
        this.viajes = viajes;
        this.busquedaRealizada = true;
        this.buscando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error =
          'No se pudo realizar la búsqueda de viajes.';
        this.buscando = false;
        this.cdr.markForCheck();
      }
    });
  }

  get cooperativasDisponibles(): string[] {
    return [...new Set(
      this.viajes.map(v => v.cooperativa)
    )].sort();
  }

  get viajesFiltrados(): ViajeCliente[] {

    return this.viajes.filter(viaje => {

      const coincideCooperativa =
        !this.cooperativaFiltro ||
        viaje.cooperativa === this.cooperativaFiltro;

      const coincidePrecio =
        this.precioMaximo === null ||
        viaje.precioBase <= this.precioMaximo;

      return coincideCooperativa && coincidePrecio;
    });
  }

  limpiarFiltros(): void {
    this.cooperativaFiltro = '';
    this.precioMaximo = null;
  }

  abrirReserva(viaje: ViajeCliente): void {
    this.viajeSeleccionado = viaje;
    this.asientosDisponibles = [];
    this.asientoSeleccionadoId = null;
    this.errorReserva = '';
    this.reservaCreada = null;
    this.dialogoReserva().nativeElement.showModal();
    this.cargandoAsientos = true;
    this.clienteApi.obtenerAsientosDisponibles(viaje).subscribe({
      next: respuesta => {
        this.asientosDisponibles = respuesta.asientos;
        this.cargandoAsientos = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorReserva = 'No se pudieron consultar los asientos. Actualiza e inténtalo de nuevo.';
        this.cargandoAsientos = false;
        this.cdr.markForCheck();
      }
    });
  }

  cerrarReserva(): void {
    if (this.reservando) return;
    this.dialogoReserva().nativeElement.close();
  }

  reservar(): void {
    if (!this.viajeSeleccionado || !this.asientoSeleccionadoId || this.reservando) return;
    if (!/^\d{10}$/.test(this.documento.trim())) {
      this.errorReserva = 'Ingresa tu cédula de 10 dígitos.';
      return;
    }
    this.reservando = true;
    this.errorReserva = '';
    this.clienteApi.crearReservaCliente({
      viajeId: this.viajeSeleccionado.viajeId,
      asientoBusId: this.asientoSeleccionadoId,
      origenRutaParadaId: this.viajeSeleccionado.origenRutaParadaId,
      destinoRutaParadaId: this.viajeSeleccionado.destinoRutaParadaId,
      documento: this.documento.trim()
    }).subscribe({
      next: reserva => {
        this.reservaCreada = reserva;
        this.reservando = false;
        this.asientosDisponibles = [];
        this.cdr.markForCheck();
      },
      error: error => {
        this.errorReserva = error?.error?.mensaje ?? 'No se pudo crear la reserva. Puede que el asiento ya no esté disponible.';
        this.reservando = false;
        this.cdr.markForCheck();
      }
    });
  }
}
