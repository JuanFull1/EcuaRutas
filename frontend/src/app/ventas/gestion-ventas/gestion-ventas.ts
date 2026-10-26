import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_URL } from '../../services/api.config';

interface VentaAsiento {
  documento: string;
  pasajero: string;
  numeroAsiento: string;
  precioFinal: number;
}

interface Venta {
  ventaId: number;
  codigo: string;
  estado: string;
  canal: string;
  total: number;
  creadoEn: string;
  expiraEn: string | null;
  salidaProgramada: string;
  rutaNombre: string;
  origen: string;
  destino: string;
  asientos: VentaAsiento[];
}

interface ResultadoVentas {
  items: Venta[];
  total: number;
  pagina: number;
  tamanoPagina: number;
}

@Component({
  selector: 'app-gestion-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './gestion-ventas.html',
  styleUrl: './gestion-ventas.css'
})
export class GestionVentas implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiUrl = `${API_URL}/Ventas`;

  busqueda = '';
  estado = '';
  desde = '';
  hasta = '';
  pagina = 1;
  readonly tamanoPagina = 20;
  total = 0;
  ventas: Venta[] = [];
  cargando = false;
  ventaProcesando: number | null = null;
  error = '';
  mensaje = '';

  ngOnInit(): void {
    this.buscar();
  }

  buscar(): void {
    this.error = '';
    this.cargando = true;
    let params = new HttpParams()
      .set('pagina', this.pagina)
      .set('tamanoPagina', this.tamanoPagina);
    if (this.busqueda.trim()) params = params.set('busqueda', this.busqueda.trim());
    if (this.estado) params = params.set('estado', this.estado);
    if (this.desde) params = params.set('desde', this.desde);
    if (this.hasta) params = params.set('hasta', this.hasta);

    this.http.get<ResultadoVentas>(this.apiUrl, { params }).subscribe({
      next: resultado => {
        this.ventas = resultado.items;
        this.total = resultado.total;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.ventas = [];
        this.cargando = false;
        this.error = error?.error?.mensaje ?? 'No se pudieron cargar las reservas y ventas.';
        this.cdr.detectChanges();
      }
    });
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.estado = '';
    this.desde = '';
    this.hasta = '';
    this.pagina = 1;
    this.mensaje = '';
    this.buscar();
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.pagina = pagina;
    this.buscar();
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total / this.tamanoPagina));
  }

  confirmar(venta: Venta): void {
    if (venta.estado !== 'RESERVADA') return;
    this.accion(venta, 'confirmar');
  }

  cancelar(venta: Venta): void {
    if (venta.estado !== 'RESERVADA') return;
    this.accion(venta, 'cancelar');
  }

  private accion(venta: Venta, accion: 'confirmar' | 'cancelar'): void {
    this.error = '';
    this.mensaje = '';
    this.ventaProcesando = venta.ventaId;
    this.http.post<any>(`${this.apiUrl}/${venta.ventaId}/${accion}`, {}).subscribe({
      next: respuesta => {
        this.ventaProcesando = null;
        this.mensaje = accion === 'confirmar'
          ? `Venta ${venta.codigo} pagada; boletos emitidos${respuesta?.codigosBoletos?.length ? ': ' + respuesta.codigosBoletos.join(', ') : '.'}`
          : `Reserva ${venta.codigo} cancelada.`;
        this.buscar();
      },
      error: error => {
        this.ventaProcesando = null;
        this.error = error?.error?.mensaje ?? `No se pudo ${accion === 'confirmar' ? 'confirmar' : 'cancelar'} la reserva.`;
        this.cdr.detectChanges();
      }
    });
  }
}
