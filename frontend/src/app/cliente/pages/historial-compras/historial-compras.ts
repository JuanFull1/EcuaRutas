
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  ClienteApiService,
  ResumenCompraCliente
} from '../../services/cliente-api.service';

@Component({
  selector: 'app-historial-compras',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial-compras.html',
  styleUrl: './historial-compras.css'
})
export class HistorialCompras implements OnInit {

  private readonly clienteApi = inject(ClienteApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  compras: ResumenCompraCliente[] = [];
  comprasFiltradas: ResumenCompraCliente[] = [];

  cargando = false;
  error = '';
  filtroEstado = 'TODOS';

  ngOnInit(): void {
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.cargando = true;
    this.error = '';

    this.clienteApi.obtenerHistorial().subscribe({
      next: compras => {
        this.compras = compras;
        this.aplicarFiltros();
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudo cargar el historial de compras.';
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  aplicarFiltros(): void {
    this.comprasFiltradas =
      this.filtroEstado === 'TODOS'
        ? [...this.compras]
        : this.compras.filter(
            compra => compra.estado === this.filtroEstado
          );
  }

  get totalCompras(): number {
    return this.compras.length;
  }

  get totalGastado(): number {
    return this.compras
      .filter(compra =>
        ['CONFIRMADA', 'PAGADA'].includes(compra.estado)
      )
      .reduce((total, compra) => total + compra.total, 0);
  }

  get comprasConfirmadas(): number {
    return this.compras.filter(
      compra => ['CONFIRMADA', 'PAGADA'].includes(compra.estado)
    ).length;
  }

  get estadosDisponibles(): string[] {
    return [...new Set(this.compras.map(c => c.estado))].sort();
  }
}
