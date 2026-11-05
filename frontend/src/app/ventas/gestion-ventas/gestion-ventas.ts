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

import {
  FormsModule
} from '@angular/forms';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  firstValueFrom
} from 'rxjs';

import {
  API_URL
} from '../../services/api.config';

import * as QRCode from 'qrcode';


interface VentaListadoAsiento {
  documento: string;
  pasajero: string;
  numeroAsiento: string;
  precioFinal: number;
  codigoBoleto?: string | null;
  estadoBoleto?: string | null;
}

interface VentaListado {
  ventaId: number;
  codigo: string;
  estado: string;
  canal: string;
  total: number;
  creadoEn: string;
  expiraEn: string | null;

  estadoPago?: string | null;
  metodoPago?: string | null;

  salidaProgramada: string;
  rutaNombre: string;
  origen: string;
  destino: string;

  asientos: VentaListadoAsiento[];
}

interface VentasPaginadas {
  items: VentaListado[];
  total: number;
  pagina: number;
  tamanoPagina: number;
}

interface BoletoOficina {
  boletoId: number;
  ventaId: number;
  codigoVenta: string;
  codigoBoleto: string;
  qrToken: string;
  estadoBoleto: string;
  generadoEn: string;
  viajeId: number;
  rutaNombre: string;
  origen: string;
  destino: string;
  salidaProgramada: string;
  pasajero: string;
  documento: string;
  asientoBusId: number;
  numeroAsiento: string;
  precioFinal: number;
}


@Component({
  selector: 'app-gestion-ventas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    DecimalPipe
  ],
  templateUrl:
    './gestion-ventas.html',

  styleUrl:
    './gestion-ventas.css'
})
export class GestionVentas
  implements OnInit {

  private readonly http =
    inject(HttpClient);

  private readonly cdr =
    inject(ChangeDetectorRef);

  ventas: VentaListado[] = [];

  total = 0;

  pagina = 1;

  tamanoPagina = 20;

  busqueda = '';

  estado = '';

  desde = '';

  hasta = '';

  cargando = false;

  procesandoId:
    number | null = null;

  mensaje = '';

  error = '';


  ngOnInit(): void {

    this.buscar();
  }


  buscar(
    pagina = 1
  ): void {

    this.cargando = true;

    this.error = '';
    this.mensaje = '';

    this.pagina = pagina;

    let params =
      new HttpParams()
        .set(
          'pagina',
          pagina.toString()
        )
        .set(
          'tamanoPagina',
          this.tamanoPagina.toString()
        );

    if (this.busqueda.trim()) {

      params =
        params.set(
          'busqueda',
          this.busqueda.trim()
        );
    }

    if (this.estado) {

      params =
        params.set(
          'estado',
          this.estado
        );
    }

    if (this.desde) {

      params =
        params.set(
          'desde',
          this.desde
        );
    }

    if (this.hasta) {

      params =
        params.set(
          'hasta',
          this.hasta
        );
    }

    this.http.get<
      VentasPaginadas
    >(
      `${API_URL}/Ventas`,
      {
        params
      }
    ).subscribe({

      next: respuesta => {

        this.ventas =
          respuesta.items;

        this.total =
          respuesta.total;

        this.pagina =
          respuesta.pagina;

        this.cargando = false;

        this.cdr.markForCheck();
      },

      error: error => {

        this.error =
          error?.error?.mensaje ??
          'No se pudieron cargar las ventas.';

        this.cargando = false;

        this.cdr.markForCheck();
      }
    });
  }


  limpiar(): void {

    this.busqueda = '';
    this.estado = '';
    this.desde = '';
    this.hasta = '';

    this.buscar(1);
  }


  get totalPaginas(): number {

    return Math.max(
      1,
      Math.ceil(
        this.total /
        this.tamanoPagina
      )
    );
  }


  confirmarEfectivo(
    venta: VentaListado
  ): void {

    if (
      this.procesandoId !== null
    ) {
      return;
    }

    this.procesandoId =
      venta.ventaId;

    this.error = '';
    this.mensaje = '';

    this.http.post(
      `${API_URL}/Ventas/` +
      `${venta.ventaId}/confirmar`,
      {}
    ).subscribe({

      next: async () => {

        this.mensaje =
          'Pago en efectivo aprobado y boletos emitidos.';

        this.procesandoId = null;

        await this.imprimir(
          venta.ventaId
        );

        this.buscar(
          this.pagina
        );
      },

      error: error => {

        this.error =
          error?.error?.mensaje ??
          'No se pudo confirmar la venta.';

        this.procesandoId = null;

        this.cdr.markForCheck();
      }
    });
  }


  cancelar(
    venta: VentaListado
  ): void {

    if (
      this.procesandoId !== null
    ) {
      return;
    }

    this.procesandoId =
      venta.ventaId;

    this.error = '';
    this.mensaje = '';

    this.http.post(
      `${API_URL}/Ventas/` +
      `${venta.ventaId}/cancelar`,
      {}
    ).subscribe({

      next: () => {

        this.mensaje =
          'Reserva cancelada correctamente.';

        this.procesandoId = null;

        this.buscar(
          this.pagina
        );
      },

      error: error => {

        this.error =
          error?.error?.mensaje ??
          'No se pudo cancelar la reserva.';

        this.procesandoId = null;

        this.cdr.markForCheck();
      }
    });
  }


  async imprimir(
    ventaId: number
  ): Promise<void> {

    try {

      const boletos =
        await firstValueFrom(
          this.http.get<
            BoletoOficina[]
          >(
            `${API_URL}/boletos-oficina/venta/` +
            ventaId
          )
        );

      if (
        boletos.length === 0
      ) {

        this.error =
          'La venta todavía no tiene boletos emitidos.';

        this.cdr.markForCheck();

        return;
      }

      const bloques:
        string[] = [];

      for (
        const boleto
        of boletos
      ) {

        const qr =
          await QRCode.toDataURL(
            boleto.qrToken,
            {
              width: 230,
              margin: 1
            }
          );

        bloques.push(`
          <article class="boleto">

            <div class="marca">
              ECUARUTAS · BOLETO DE VIAJE
            </div>

            <h1>
              ${this.escapar(
                boleto.rutaNombre
              )}
            </h1>

            <div class="tramo">
              ${this.escapar(
                boleto.origen
              )}
              →
              ${this.escapar(
                boleto.destino
              )}
            </div>

            <div class="datos">

              <div>
                <small>Pasajero</small>
                <strong>
                  ${this.escapar(
                    boleto.pasajero
                  )}
                </strong>
              </div>

              <div>
                <small>Documento</small>
                <strong>
                  ${this.escapar(
                    boleto.documento
                  )}
                </strong>
              </div>

              <div>
                <small>Salida</small>
                <strong>
                  ${new Date(
                    boleto.salidaProgramada
                  ).toLocaleString(
                    'es-EC'
                  )}
                </strong>
              </div>

              <div>
                <small>Asiento</small>
                <strong>
                  ${this.escapar(
                    boleto.numeroAsiento
                  )}
                </strong>
              </div>

              <div>
                <small>Precio</small>
                <strong>
                  $${boleto.precioFinal
                    .toFixed(2)}
                </strong>
              </div>

            </div>

            <div class="codigo">

              <small>
                Código del boleto
              </small>

              <strong>
                ${this.escapar(
                  boleto.codigoBoleto
                )}
              </strong>

            </div>

            <div class="qr">

              <img
                src="${qr}"
                alt="QR del boleto"
              >

              <p>
                Presenta este código
                al abordar.
              </p>

            </div>

          </article>
        `);
      }

      const ventana =
        window.open(
          '',
          '_blank',
          'width=760,height=900'
        );

      if (!ventana) {

        this.error =
          'El navegador bloqueó la ventana de impresión.';

        return;
      }

      ventana.document.write(`
        <!doctype html>

        <html lang="es">

        <head>

          <meta charset="utf-8">

          <title>
            Boletos EcuaRutas
          </title>

          <style>

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 22px;
              font-family:
                Arial,
                sans-serif;
              background: #f5f7fb;
              color: #14213d;
            }

            .acciones {
              max-width: 760px;
              margin:
                0 auto 18px;
              text-align: right;
            }

            button {
              padding:
                10px 18px;
              border: 0;
              border-radius: 6px;
              background: #0d6efd;
              color: #fff;
              font-weight: 700;
              cursor: pointer;
            }

            .boleto {
              max-width: 760px;
              margin:
                0 auto 24px;
              padding: 28px;

              border-top:
                5px solid #0d6efd;

              border-radius: 8px;

              background: #fff;

              box-shadow:
                0 4px 20px
                rgba(0,0,0,.08);
            }

            .marca {
              color: #0d6efd;
              font-size: 12px;
              font-weight: 800;
              letter-spacing: .8px;
            }

            h1 {
              margin:
                10px 0 15px;
            }

            .tramo {
              padding-bottom: 18px;

              border-bottom:
                1px solid #dce1e8;
            }

            .datos {
              display: grid;

              grid-template-columns:
                1fr 1fr;

              gap: 20px;

              padding:
                20px 0;
            }

            small {
              display: block;
              margin-bottom: 4px;
              color: #667085;
            }

            strong {
              display: block;
            }

            .codigo {
              padding: 14px;

              border:
                1px dashed #8ba7cf;

              border-radius: 6px;
            }

            .qr {
              text-align: center;

              padding-top: 18px;
            }

            .qr img {
              width: 205px;
              height: 205px;
            }

            .qr p {
              margin-top: 8px;
              font-size: 13px;
            }

            @media print {

              body {
                padding: 0;
                background: white;
              }

              .acciones {
                display: none;
              }

              .boleto {
                box-shadow: none;
                break-after: page;
              }

            }

          </style>

        </head>

        <body>

          <div class="acciones">

            <button
              onclick="window.print()"
            >
              Imprimir boletos
            </button>

          </div>

          ${bloques.join('')}

        </body>

        </html>
      `);

      ventana.document.close();

    } catch (error: any) {

      this.error =
        error?.error?.mensaje ??
        'No se pudieron consultar los boletos de la venta.';

      this.cdr.markForCheck();
    }
  }


  private escapar(
    valor: string
  ): string {

    return valor
      .replaceAll(
        '&',
        '&amp;'
      )
      .replaceAll(
        '<',
        '&lt;'
      )
      .replaceAll(
        '>',
        '&gt;'
      )
      .replaceAll(
        '"',
        '&quot;'
      )
      .replaceAll(
        "'",
        '&#039;'
      );
  }
}