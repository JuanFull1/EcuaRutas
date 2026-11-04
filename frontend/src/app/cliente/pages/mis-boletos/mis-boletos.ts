
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
  DetalleBoletoCliente
} from '../../services/cliente-api.service';

@Component({
  selector: 'app-mis-boletos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-boletos.html',
  styleUrl: './mis-boletos.css'
})
export class MisBoletos implements OnInit {

  private readonly clienteApi = inject(ClienteApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  boletos: DetalleBoletoCliente[] = [];

  cargando = false;
  error = '';

  filtroEstado = '';
  busqueda = '';

  ngOnInit(): void {
    this.cargarBoletos();
  }

  cargarBoletos(): void {
    this.cargando = true;
    this.error = '';

    this.clienteApi.obtenerBoletos().subscribe({
      next: boletos => {
        this.boletos = boletos;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudieron cargar tus boletos.';
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  get boletosFiltrados(): DetalleBoletoCliente[] {
    const texto = this.busqueda.trim().toLowerCase();

    return this.boletos.filter(boleto => {
      const coincideTexto =
        !texto ||
        boleto.codigoBoleto.toLowerCase().includes(texto) ||
        boleto.codigoVenta.toLowerCase().includes(texto);

      const coincideEstado =
        !this.filtroEstado ||
        boleto.estadoBoleto === this.filtroEstado;

      return coincideTexto && coincideEstado;
    });
  }

  get estadosDisponibles(): string[] {
    return [...new Set(
      this.boletos.map(b => b.estadoBoleto)
    )].sort();
  }

  get boletosVigentes(): number {
    return this.boletos.filter(b =>
      b.estadoBoleto === 'EMITIDO' ||
      b.estadoBoleto === 'ACTIVO'
    ).length;
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroEstado = '';
  }
}
