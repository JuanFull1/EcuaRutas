
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import {
  CommonModule,
  DatePipe,
  DecimalPipe
} from '@angular/common';

import { FormsModule } from '@angular/forms';

import {
  ClienteApiService,
  LugarCliente,
  ViajeCliente
} from '../../services/cliente-api.service';

@Component({
  selector: 'app-buscar-viajes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    DecimalPipe
  ],
  templateUrl: './buscar-viajes.html',
  styleUrl: './buscar-viajes.css'
})
export class BuscarViajes implements OnInit {

  private readonly clienteApi = inject(ClienteApiService);
  private readonly cdr = inject(ChangeDetectorRef);

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

  ngOnInit(): void {
    this.cargarLugares();
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
}
