
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ClienteApiService,
  NotificacionCliente
} from '../../services/cliente-api.service';

@Component({
  selector: 'app-notificaciones-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notificaciones.html',
  styleUrl: './notificaciones.css'
})
export class NotificacionesCliente implements OnInit {

  private readonly clienteApi = inject(ClienteApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  notificaciones: NotificacionCliente[] = [];

  cargando = false;
  error = '';

  busqueda = '';
  filtroTipo = '';
  filtroEstado = '';

  ngOnInit(): void {
    this.cargarNotificaciones();
  }

  cargarNotificaciones(): void {
    this.cargando = true;
    this.error = '';

    this.clienteApi.obtenerNotificaciones().subscribe({
      next: (resultado) => {
        this.notificaciones = resultado;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.notificaciones = [];
        this.error = 'No se pudieron cargar las notificaciones.';
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  get totalNotificaciones(): number {
    return this.notificaciones.length;
  }

  get totalPendientes(): number {
    return this.notificaciones.filter(
      n => n.estado.toUpperCase() === 'PENDIENTE'
    ).length;
  }

  get totalEnviadas(): number {
    return this.notificaciones.filter(
      n => n.estado.toUpperCase() === 'ENVIADO'
        || n.estado.toUpperCase() === 'ENVIADA'
    ).length;
  }

  get tiposDisponibles(): string[] {
    return [...new Set(
      this.notificaciones.map(n => n.tipo)
    )].sort();
  }

  get estadosDisponibles(): string[] {
    return [...new Set(
      this.notificaciones.map(n => n.estado)
    )].sort();
  }

  get notificacionesFiltradas(): NotificacionCliente[] {
    const texto = this.busqueda.trim().toLowerCase();

    return this.notificaciones.filter(n => {
      const coincideBusqueda =
        !texto ||
        n.asunto.toLowerCase().includes(texto) ||
        n.tipo.toLowerCase().includes(texto) ||
        (n.ventaId !== null &&
          n.ventaId.toString().includes(texto));

      const coincideTipo =
        !this.filtroTipo || n.tipo === this.filtroTipo;

      const coincideEstado =
        !this.filtroEstado || n.estado === this.filtroEstado;

      return coincideBusqueda &&
        coincideTipo &&
        coincideEstado;
    });
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroTipo = '';
    this.filtroEstado = '';
  }

  iconoTipo(tipo: string): string {
    const valor = tipo.toUpperCase();

    if (valor.includes('PAGO')) {
      return 'bi-credit-card';
    }

    if (valor.includes('BOLETO')) {
      return 'bi-ticket-perforated';
    }

    if (valor.includes('VIAJE')) {
      return 'bi-bus-front';
    }

    if (valor.includes('COMPRA') ||
        valor.includes('VENTA')) {
      return 'bi-bag-check';
    }

    return 'bi-bell';
  }

  claseEstado(estado: string): string {
    switch (estado.toUpperCase()) {
      case 'ENVIADO':
      case 'ENVIADA':
        return 'text-bg-success';

      case 'PENDIENTE':
        return 'text-bg-warning';

      case 'ERROR':
      case 'FALLIDO':
      case 'FALLIDA':
        return 'text-bg-danger';

      default:
        return 'text-bg-secondary';
    }
  }
}
