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

import {
  AsientoMapa,
  MapaAsientos,
  PosicionAsiento
} from '../../shared/mapa-asientos/mapa-asientos';

import * as QRCode from 'qrcode';


interface LugarDisponibilidad {
  lugarId: number;
  nombre: string;
  provincia?: string;
  canton?: string;
}

interface ViajeDisponibilidad {
  viajeId: number;
  frecuenciaId: number;
  rutaId: number;
  rutaNombre: string;
  codigoFrecuencia?: string;
  salidaProgramada: string;
  estado: string;

  busId: number;
  numeroInternoBus: string;
  placaBus: string;
  capacidadBus: number;

  origenRutaParadaId: number;
  destinoRutaParadaId: number;

  precioBase: number;
  cooperativa: string;
}

interface AsientoDisponible {
  asientoBusId: number;
  numero: string;
  piso: number;
  fila: number;
  columna: number;
  tipoAsientoId: number;
  tipoAsiento: string;
  recargoPorcentaje: number;
  precioBase: number;
  recargoAsiento: number;
  precioFinal: number;
}

interface DisponibilidadResponse {
  viajeId: number;
  origenRutaParadaId: number;
  destinoRutaParadaId: number;
  asientos: AsientoDisponible[];
}

interface PasajeroOficina {
  pasajeroId: number;
  tipoDocumento: string;
  documento: string;
  nombres: string;
  apellidos: string;
  correo?: string | null;
  telefono?: string | null;
  discapacidad: boolean;
}

interface ReservaResponse {
  ventaId: number;
  codigo: string;
  viajeId: number;
  canal: string;
  estado: string;
  subtotal: number;
  descuentoTotal: number;
  total: number;
  expiraEn: string;
  codigosBoletos?: string[];
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
  selector: 'app-disponibilidad',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    DecimalPipe,
    MapaAsientos
  ],
  templateUrl: './disponibilidad.html',
  styleUrl: './disponibilidad.css'
})
export class Disponibilidad implements OnInit {

  private readonly http =
    inject(HttpClient);

  private readonly cdr =
    inject(ChangeDetectorRef);

  private readonly dialogo =
    viewChild.required<
      ElementRef<HTMLDialogElement>
    >('dialogoAsientos');

  lugares: LugarDisponibilidad[] = [];

  viajes: ViajeDisponibilidad[] = [];

  origenLugarId: number | null = null;

  destinoLugarId: number | null = null;

  fecha = '';

  buscando = false;

  busquedaRealizada = false;

  error = '';

  viajeSeleccionado:
    ViajeDisponibilidad | null = null;

  asientos: AsientoDisponible[] = [];

  asientoSeleccionadoId:
    number | null = null;

  cargandoAsientos = false;

  procesandoVenta = false;

  mensajeModal = '';

  errorModal = '';

  documento = '';

  tipoDocumento = 'CEDULA';

  nombres = '';

  apellidos = '';

  correo = '';

  telefono = '';

  discapacidad = false;

  carnetConadis = '';

  pasajero:
    PasajeroOficina | null = null;

  buscandoPasajero = false;

  pasajeroNoExiste = false;

  readonly minutosReserva = 15;


  ngOnInit(): void {
    this.cargarLugares();
  }


  cargarLugares(): void {

    this.http.get<LugarDisponibilidad[]>(
      `${API_URL}/Disponibilidad/lugares`
    ).subscribe({

      next: lugares => {

        this.lugares = lugares;

        this.cdr.markForCheck();
      },

      error: () => {

        this.error =
          'No se pudieron cargar los lugares.';

        this.cdr.markForCheck();
      }
    });
  }


  buscarViajes(): void {

    this.error = '';

    if (
      !this.origenLugarId ||
      !this.destinoLugarId ||
      !this.fecha
    ) {
      this.error =
        'Selecciona origen, destino y fecha.';
      return;
    }

    if (
      this.origenLugarId ===
      this.destinoLugarId
    ) {
      this.error =
        'El origen y destino deben ser diferentes.';
      return;
    }

    this.buscando = true;
    this.busquedaRealizada = false;
    this.viajes = [];

    const params =
      new HttpParams()
        .set(
          'origenLugarId',
          this.origenLugarId.toString()
        )
        .set(
          'destinoLugarId',
          this.destinoLugarId.toString()
        )
        .set(
          'fecha',
          this.fecha
        );

    this.http.get<
      ViajeDisponibilidad[]
    >(
      `${API_URL}/Disponibilidad/viajes`,
      {
        params
      }
    ).subscribe({

      next: viajes => {

        this.viajes = viajes;

        this.buscando = false;
        this.busquedaRealizada = true;

        this.cdr.markForCheck();
      },

      error: error => {

        this.error =
          error?.error?.mensaje ??
          'No se pudo consultar la disponibilidad.';

        this.buscando = false;
        this.busquedaRealizada = true;

        this.cdr.markForCheck();
      }
    });
  }


  abrirAsientos(
    viaje: ViajeDisponibilidad
  ): void {

    this.viajeSeleccionado =
      viaje;

    this.asientos = [];

    this.asientoSeleccionadoId =
      null;

    this.resetPasajero();

    this.errorModal = '';
    this.mensajeModal = '';

    this.cargandoAsientos = true;

    this.dialogo()
      .nativeElement
      .showModal();

    const params =
      new HttpParams()
        .set(
          'viajeId',
          viaje.viajeId.toString()
        )
        .set(
          'origenRutaParadaId',
          viaje.origenRutaParadaId.toString()
        )
        .set(
          'destinoRutaParadaId',
          viaje.destinoRutaParadaId.toString()
        );

    this.http.get<
      DisponibilidadResponse
    >(
      `${API_URL}/Disponibilidad`,
      {
        params
      }
    ).subscribe({

      next: respuesta => {

        this.asientos =
          respuesta.asientos;

        this.cargandoAsientos = false;

        this.cdr.markForCheck();
      },

      error: error => {

        this.errorModal =
          error?.error?.mensaje ??
          'No se pudieron consultar los asientos.';

        this.cargandoAsientos = false;

        this.cdr.markForCheck();
      }
    });
  }


  cerrarAsientos(): void {

    if (this.procesandoVenta) {
      return;
    }

    this.dialogo()
      .nativeElement
      .close();

    this.viajeSeleccionado = null;
    this.asientos = [];
    this.asientoSeleccionadoId = null;

    this.resetPasajero();
  }


  get pisosMapa(): number {

    return Math.max(
      1,
      ...this.asientos.map(
        asiento => asiento.piso
      )
    );
  }


  get filasMapa(): number {

    return Math.max(
      1,
      ...this.asientos.map(
        asiento => asiento.fila
      )
    );
  }


  get columnasMapa(): number {

    return Math.max(
      1,
      ...this.asientos.map(
        asiento => asiento.columna
      )
    );
  }


  get asientoSeleccionado():
    AsientoDisponible | null {

    if (!this.asientoSeleccionadoId) {
      return null;
    }

    return (
      this.asientos.find(
        asiento =>
          asiento.asientoBusId ===
          this.asientoSeleccionadoId
      ) ?? null
    );
  }


  get posicionSeleccionada():
    PosicionAsiento | null {

    const asiento =
      this.asientoSeleccionado;

    if (!asiento) {
      return null;
    }

    return {
      piso: asiento.piso,
      fila: asiento.fila,
      columna: asiento.columna
    };
  }


  get asientosMapa(): AsientoMapa[] {

    return this.asientos.map(
      asiento => ({
        numero:
          asiento.numero,

        piso:
          asiento.piso,

        fila:
          asiento.fila,

        columna:
          asiento.columna,

        tipoId:
          asiento.tipoAsientoId,

        tipoNombre:
          asiento.tipoAsiento,

        colorIndex:
          Math.abs(
            asiento.tipoAsientoId - 1
          ) % 6,

        precio:
          asiento.precioFinal,

        estado:
          asiento.asientoBusId ===
          this.asientoSeleccionadoId
            ? 'SELECCIONADO'
            : 'LIBRE'
      })
    );
  }


  seleccionarAsiento(
    posicion: PosicionAsiento
  ): void {

    const asiento =
      this.asientos.find(
        item =>
          item.piso === posicion.piso &&
          item.fila === posicion.fila &&
          item.columna === posicion.columna
      );

    if (!asiento) {
      return;
    }

    this.asientoSeleccionadoId =
      asiento.asientoBusId;

    this.errorModal = '';
  }


  buscarPasajero(): void {

    const documento =
      this.documento.trim();

    this.errorModal = '';
    this.mensajeModal = '';
    this.pasajero = null;
    this.pasajeroNoExiste = false;

    if (
      documento.length < 5
    ) {
      this.errorModal =
        'Ingresa un documento válido.';
      return;
    }

    this.buscandoPasajero = true;

    this.http.get<PasajeroOficina>(
      `${API_URL}/pasajeros-oficina/documento/` +
      encodeURIComponent(documento)
    ).subscribe({

      next: pasajero => {

        this.pasajero =
          pasajero;

        this.tipoDocumento =
          pasajero.tipoDocumento;

        this.nombres =
          pasajero.nombres;

        this.apellidos =
          pasajero.apellidos;

        this.correo =
          pasajero.correo ?? '';

        this.telefono =
          pasajero.telefono ?? '';

        this.discapacidad =
          pasajero.discapacidad;

        this.buscandoPasajero = false;

        this.mensajeModal =
          'Pasajero encontrado.';

        this.cdr.markForCheck();
      },

      error: error => {

        this.buscandoPasajero = false;

        if (error?.status === 404) {

          this.pasajeroNoExiste = true;

          this.mensajeModal =
            'Pasajero nuevo. Completa sus datos.';

        } else {

          this.errorModal =
            error?.error?.mensaje ??
            'No se pudo buscar el pasajero.';
        }

        this.cdr.markForCheck();
      }
    });
  }


  async reservar(): Promise<void> {

    await this.procesarVenta(false);
  }


  async venderEfectivo(): Promise<void> {

    await this.procesarVenta(true);
  }


  private async procesarVenta(
    confirmarEfectivo: boolean
  ): Promise<void> {

    if (
      !this.viajeSeleccionado ||
      !this.asientoSeleccionado
    ) {
      this.errorModal =
        'Selecciona un asiento.';
      return;
    }

    if (
      !this.documento.trim()
    ) {
      this.errorModal =
        'Ingresa el documento del pasajero.';
      return;
    }

    this.procesandoVenta = true;

    this.errorModal = '';
    this.mensajeModal = '';

    try {

      const pasajero =
        await this.obtenerOCrearPasajero();

      const reserva =
        await firstValueFrom(
          this.http.post<ReservaResponse>(
            `${API_URL}/Ventas/reservar`,
            {
              viajeId:
                this.viajeSeleccionado.viajeId,

              usuarioClienteId:
                null,

              canal:
                'OFICINA',

              minutosExpiracion:
                this.minutosReserva,

              asientos: [
                {
                  pasajeroId:
                    pasajero.pasajeroId,

                  asientoBusId:
                    this.asientoSeleccionado
                      .asientoBusId,

                  origenRutaParadaId:
                    this.viajeSeleccionado
                      .origenRutaParadaId,

                  destinoRutaParadaId:
                    this.viajeSeleccionado
                      .destinoRutaParadaId
                }
              ]
            }
          )
        );

      if (!confirmarEfectivo) {

        this.mensajeModal =
          `Reserva ${reserva.codigo} creada correctamente.`;

        this.procesandoVenta = false;

        await this.refrescarAsientos();

        return;
      }

      await firstValueFrom(
        this.http.post<ReservaResponse>(
          `${API_URL}/Ventas/` +
          `${reserva.ventaId}/confirmar`,
          {}
        )
      );

      const boletos =
        await firstValueFrom(
          this.http.get<BoletoOficina[]>(
            `${API_URL}/boletos-oficina/venta/` +
            reserva.ventaId
          )
        );

      this.procesandoVenta = false;

      this.dialogo()
        .nativeElement
        .close();

      await this.imprimirBoletos(
        boletos
      );

      this.buscarViajes();

    } catch (error: any) {

      this.errorModal =
        error?.error?.mensaje ??
        'No se pudo completar la venta.';

      this.procesandoVenta = false;

      this.cdr.markForCheck();
    }
  }


  private async obtenerOCrearPasajero():
    Promise<PasajeroOficina> {

    if (
      this.pasajero &&
      this.pasajero.documento ===
      this.documento.trim()
    ) {
      return this.pasajero;
    }

    try {

      return await firstValueFrom(
        this.http.get<PasajeroOficina>(
          `${API_URL}/pasajeros-oficina/documento/` +
          encodeURIComponent(
            this.documento.trim()
          )
        )
      );

    } catch (error: any) {

      if (error?.status !== 404) {
        throw error;
      }
    }

    if (
      !this.nombres.trim() ||
      !this.apellidos.trim()
    ) {
      throw {
        error: {
          mensaje:
            'El pasajero no existe. Ingresa nombres y apellidos.'
        }
      };
    }

    return await firstValueFrom(
      this.http.post<PasajeroOficina>(
        `${API_URL}/pasajeros-oficina`,
        {
          tipoDocumento:
            this.tipoDocumento,

          documento:
            this.documento.trim(),

          nombres:
            this.nombres.trim(),

          apellidos:
            this.apellidos.trim(),

          correo:
            this.correo.trim() || null,

          telefono:
            this.telefono.trim() || null,

          discapacidad:
            this.discapacidad,

          carnetConadis:
            this.discapacidad
              ? this.carnetConadis.trim() || null
              : null
        }
      )
    );
  }


  private async refrescarAsientos():
    Promise<void> {

    if (!this.viajeSeleccionado) {
      return;
    }

    const params =
      new HttpParams()
        .set(
          'viajeId',
          this.viajeSeleccionado
            .viajeId.toString()
        )
        .set(
          'origenRutaParadaId',
          this.viajeSeleccionado
            .origenRutaParadaId.toString()
        )
        .set(
          'destinoRutaParadaId',
          this.viajeSeleccionado
            .destinoRutaParadaId.toString()
        );

    const respuesta =
      await firstValueFrom(
        this.http.get<
          DisponibilidadResponse
        >(
          `${API_URL}/Disponibilidad`,
          {
            params
          }
        )
      );

    this.asientos =
      respuesta.asientos;

    this.asientoSeleccionadoId =
      null;

    this.cdr.markForCheck();
  }


  private async imprimirBoletos(
    boletos: BoletoOficina[]
  ): Promise<void> {

    if (boletos.length === 0) {
      return;
    }

    const bloques:
      string[] = [];

    for (
      const boleto of boletos
    ) {

      const qr =
        await QRCode.toDataURL(
          boleto.qrToken,
          {
            width: 220,
            margin: 1
          }
        );

      bloques.push(`
        <article class="boleto">
          <div class="marca">
            ECUARUTAS · BOLETO DE VIAJE
          </div>

          <h1>${this.escapar(
            boleto.rutaNombre
          )}</h1>

          <div class="tramo">
            ${this.escapar(
              boleto.origen
            )}
            →
            ${this.escapar(
              boleto.destino
            )}
          </div>

          <div class="grid">
            <div>
              <small>Pasajero</small>
              <strong>${this.escapar(
                boleto.pasajero
              )}</strong>
            </div>

            <div>
              <small>Documento</small>
              <strong>${this.escapar(
                boleto.documento
              )}</strong>
            </div>

            <div>
              <small>Salida</small>
              <strong>${new Date(
                boleto.salidaProgramada
              ).toLocaleString(
                'es-EC'
              )}</strong>
            </div>

            <div>
              <small>Asiento</small>
              <strong>${this.escapar(
                boleto.numeroAsiento
              )}</strong>
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
            <small>Código del boleto</small>
            <strong>
              ${this.escapar(
                boleto.codigoBoleto
              )}
            </strong>
          </div>

          <div class="qr">
            <img
              src="${qr}"
              alt="Código QR"
            >
            <p>
              Presenta este código al abordar.
            </p>
          </div>
        </article>
      `);
    }

    const ventana =
      window.open(
        '',
        '_blank',
        'width=760,height=850'
      );

    if (!ventana) {
      return;
    }

    ventana.document.write(`
      <!doctype html>
      <html lang="es">
      <head>
        <meta charset="utf-8">

        <title>Boletos EcuaRutas</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 24px;
            font-family:
              Arial,
              sans-serif;
            background: #f5f7fb;
            color: #172033;
          }

          .acciones {
            max-width: 760px;
            margin:
              0 auto 18px;
            text-align: right;
          }

          button {
            border: 0;
            border-radius: 6px;
            padding:
              10px 18px;
            background: #0d6efd;
            color: white;
            font-weight: 700;
            cursor: pointer;
          }

          .boleto {
            max-width: 760px;
            margin:
              0 auto 22px;
            padding: 28px;
            background: white;
            border-top:
              5px solid #0d6efd;
            border-radius: 8px;
            box-shadow:
              0 4px 18px
              rgba(0,0,0,.08);
          }

          .marca {
            color: #0d6efd;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: .7px;
          }

          h1 {
            margin:
              10px 0 16px;
          }

          .tramo {
            padding-bottom: 18px;
            border-bottom:
              1px solid #ddd;
            font-size: 16px;
          }

          .grid {
            display: grid;
            grid-template-columns:
              1fr 1fr;
            gap: 18px;
            padding:
              20px 0;
          }

          small {
            display: block;
            color: #687386;
            margin-bottom: 4px;
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
            padding-top: 20px;
          }

          .qr img {
            width: 200px;
            height: 200px;
          }

          .qr p {
            font-size: 13px;
          }

          @media print {
            body {
              background: white;
              padding: 0;
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
  }


  private escapar(
    valor: string
  ): string {

    return valor
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }


  private resetPasajero(): void {

    this.documento = '';
    this.tipoDocumento = 'CEDULA';
    this.nombres = '';
    this.apellidos = '';
    this.correo = '';
    this.telefono = '';
    this.discapacidad = false;
    this.carnetConadis = '';

    this.pasajero = null;
    this.pasajeroNoExiste = false;
    this.buscandoPasajero = false;
  }
}