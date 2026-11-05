
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as QRCode from 'qrcode';

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
  qrPorBoleto: Record<number, string> = {};

  ngOnInit(): void {
    this.cargarBoletos();
  }

  cargarBoletos(): void {
    this.cargando = true;
    this.error = '';

    this.clienteApi.obtenerBoletos().subscribe({
      next: boletos => {
        this.boletos = boletos;
        this.qrPorBoleto = {};
        this.cargando = false;
        this.cdr.markForCheck();
        for (const boleto of boletos) {
          QRCode.toDataURL(boleto.qrToken, { width: 180, margin: 1 })
            .then(dataUrl => {
              this.qrPorBoleto[boleto.boletoId] = dataUrl;
              this.cdr.markForCheck();
            })
            .catch(() => {
              this.error = 'No se pudo generar el código QR de uno de tus boletos.';
              this.cdr.markForCheck();
            });
        }
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

  imprimir(boletoId: number): void {
    const boleto = this.boletos.find(item => item.boletoId === boletoId);
    const qr = this.qrPorBoleto[boletoId];
    if (!boleto || !qr) return;

    const ventana = window.open('', '_blank', 'width=800,height=700');
    if (!ventana) {
      this.error = 'El navegador bloqueó la ventana de impresión. Permite ventanas emergentes e inténtalo de nuevo.';
      return;
    }
    const escapar = (valor: string): string => valor
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
    const moneda = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });
    ventana.addEventListener('load', () => window.setTimeout(() => { ventana.focus(); ventana.print(); }, 250), { once: true });
    ventana.document.open();
    ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Boleto ${escapar(boleto.codigoBoleto)}</title><style>
      *{box-sizing:border-box}body{margin:0;padding:24px;background:#eef2f7;color:#152f4d;font:16px/1.5 Arial,sans-serif}.boleto{max-width:700px;margin:auto;padding:28px;border:1px solid #cbd5e1;border-top:6px solid #1677c8;border-radius:10px;background:#fff}.marca{color:#1677c8;font-weight:700;letter-spacing:.08em}.boleto h1{font-size:24px}.datos{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px}.dato small{display:block;color:#64748b}.qr{display:flex;align-items:center;gap:20px;margin-top:22px;padding-top:18px;border-top:1px solid #dbe3ec}.qr img{width:180px;height:180px}.codigo{overflow-wrap:anywhere;font-weight:700}@media print{body{padding:0;background:#fff}.boleto{border-radius:0;box-shadow:none}}
      </style></head><body><article class="boleto"><div class="marca">ECUARUTAS · BOLETO DE VIAJE</div><h1>${escapar(boleto.rutaNombre)}</h1><p>${escapar(boleto.origen)} → ${escapar(boleto.destino)}</p><div class="datos"><div class="dato"><small>Pasajero</small><strong>${escapar(boleto.pasajero)}</strong></div><div class="dato"><small>Asiento</small><strong>${escapar(boleto.numeroAsiento)}</strong></div><div class="dato"><small>Salida</small><strong>${escapar(new Date(boleto.salidaProgramada).toLocaleString('es-EC'))}</strong></div><div class="dato"><small>Precio</small><strong>${moneda.format(boleto.precioFinal)}</strong></div><div class="dato"><small>Código de compra</small><strong>${escapar(boleto.codigoVenta)}</strong></div><div class="dato"><small>Estado</small><strong>${escapar(boleto.estadoBoleto)}</strong></div></div><div class="qr"><img src="${qr}" alt="Código QR del boleto"><div><small>Código del boleto</small><div class="codigo">${escapar(boleto.codigoBoleto)}</div><p>Presenta este QR al abordar.</p></div></div></article></body></html>`);
    ventana.document.close();
  }
}
