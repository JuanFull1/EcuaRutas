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
  codigoBoleto: string | null;
  estadoBoleto: string | null;
}

interface Venta {
  ventaId: number;
  codigo: string;
  estado: string;
  canal: string;
  total: number;
  creadoEn: string;
  expiraEn: string | null;
  estadoPago: string | null;
  metodoPago: string | null;
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

  tieneBoletos(venta: Venta): boolean {
    return venta.asientos.some(asiento => !!asiento.codigoBoleto);
  }

  imprimirBoletos(venta: Venta): void {
    const boletos = venta.asientos.filter(asiento => !!asiento.codigoBoleto);
    if (boletos.length === 0) return;

    const ventana = window.open('', '_blank', 'width=900,height=700');
    if (!ventana) {
      this.error = 'El navegador bloqueó la ventana de impresión. Permita las ventanas emergentes para este sitio e inténtelo de nuevo.';
      return;
    }

    const escapar = (valor: string): string => valor
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
    const fecha = escapar(new Date(venta.salidaProgramada).toLocaleString('es-EC'));
    const ruta = escapar(venta.rutaNombre);
    const tramo = escapar(`${venta.origen} → ${venta.destino}`);
    const moneda = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });
    const tarjetas = boletos.map(asiento => `
      <article class="boleto">
        <header><span>ECUARUTAS · BOLETO DE VIAJE</span><strong>${ruta}</strong></header>
        <p class="tramo">${tramo}</p>
        <div class="datos">
          <div><small>Pasajero</small><strong>${escapar(asiento.pasajero)}</strong></div>
          <div><small>Documento</small><strong>${escapar(asiento.documento)}</strong></div>
          <div><small>Salida</small><strong>${fecha}</strong></div>
          <div><small>Asiento</small><strong>${escapar(asiento.numeroAsiento)}</strong></div>
          <div><small>Precio</small><strong>${moneda.format(asiento.precioFinal)}</strong></div>
        </div>
        <div class="codigo"><small>Código del boleto</small><strong>${escapar(asiento.codigoBoleto!)}</strong></div>
        <footer>Presente este boleto al abordar.</footer>
      </article>`).join('');

    ventana.addEventListener('load', () => {
      window.setTimeout(() => {
        ventana.focus();
        ventana.print();
      }, 300);
    }, { once: true });
    ventana.document.open();
    ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boletos ${escapar(venta.codigo)}</title><style>
      *{box-sizing:border-box}body{margin:0;padding:28px;background:#eef2f7;color:#152b43;font:16px/1.45 Arial,sans-serif}.acciones{max-width:760px;margin:0 auto 18px;text-align:right}.acciones button{padding:10px 18px;border:0;border-radius:6px;background:#1677c8;color:white;font-size:15px;cursor:pointer}.boleto{max-width:760px;margin:0 auto 22px;padding:28px;border:1px solid #cbd5e1;border-top:6px solid #1677c8;border-radius:10px;background:white;box-shadow:0 4px 16px #0f172a12;break-inside:avoid}.boleto header{display:grid;gap:8px;padding-bottom:16px;border-bottom:1px solid #dbe3ec}.boleto header span{color:#1677c8;font-size:12px;font-weight:700;letter-spacing:.08em}.boleto header strong{font-size:23px}.tramo{margin:16px 0 20px;font-size:17px}.datos{display:grid;grid-template-columns:1fr 1fr;gap:16px 24px}.datos div,.codigo{display:grid;gap:4px}.datos small,.codigo small{color:#64748b}.datos strong{font-size:16px}.codigo{margin-top:22px;padding:14px;border:1px dashed #94a3b8;border-radius:6px}.codigo strong{overflow-wrap:anywhere;font-size:17px;letter-spacing:.04em}.boleto footer{padding-top:14px;color:#475569;font-size:13px}.boleto+.boleto{break-before:page}@media(max-width:600px){body{padding:12px}.boleto{padding:18px}.datos{grid-template-columns:1fr}}@media print{body{padding:0;background:white}.acciones{display:none}.boleto{max-width:none;margin:0 0 10mm;box-shadow:none}.boleto:last-child{margin-bottom:0}}
    </style></head><body><div class="acciones"><button id="imprimir">Imprimir boletos</button></div>${tarjetas}</body></html>`);
    ventana.document.close();
    ventana.document.getElementById('imprimir')?.addEventListener('click', () => ventana.print());
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
