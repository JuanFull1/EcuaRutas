import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import {
  DatePipe,
  DecimalPipe
} from '@angular/common';

import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { API_URL } from '../../services/api.config';

interface Lugar {
  lugarId: number;
  nombre: string;
  provincia?: string;
  canton?: string;
}

interface Viaje {
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
  fila: number | null;
  columna: number | null;
  tipoAsientoId: number;
  tipoAsiento: string;
  recargoPorcentaje: number;
  precioBase: number;
  recargoAsiento: number;
  precioFinal: number;
}

interface RespuestaDisponibilidad {
  viajeId: number;
  origenRutaParadaId: number;
  destinoRutaParadaId: number;
  asientos: AsientoDisponible[];
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
  codigosBoletos: string[];
}

interface PasajeroEncontrado {
  pasajeroId: number;
  documento: string;
  nombres: string;
  apellidos: string;
}

@Component({
  selector: 'app-disponibilidad',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    DecimalPipe,
    RouterLink
  ],
  templateUrl: './disponibilidad.html',
  styleUrl: './disponibilidad.css'
})
export class Disponibilidad implements OnInit {

  private readonly apiUrl = `${API_URL}/Disponibilidad`;
  private readonly ventasApiUrl = `${API_URL}/Ventas`;

  lugares: Lugar[] = [];
  viajes: Viaje[] = [];
  viajeSeleccionado: Viaje | null = null;
  modalAsientosAbierto = false;
  modalReservaAbierto = false;
  asientosDisponibles: AsientoDisponible[] = [];
  asientoSeleccionado: AsientoDisponible | null = null;
  documentoPasajero = '';
  pasajeroEncontrado: PasajeroEncontrado | null = null;
  reservaCreada: ReservaResponse | null = null;

  origenLugarId: number | null = null;
  destinoLugarId: number | null = null;
  fecha = '';

  cargandoLugares = false;
  cargandoViajes = false;
  cargandoAsientos = false;
  reservando = false;

  mensaje = '';
  error = '';

  ngOnInit(): void {
    this.cargarLugares();
  }

  constructor(
  private readonly http: HttpClient,
  private readonly cdr: ChangeDetectorRef
) {}

  cargarLugares(): void {

    this.cargandoLugares = true;
    this.error = '';

    this.http
      .get<Lugar[]>(`${this.apiUrl}/lugares`)
      .subscribe({
        next: respuesta => {

  console.log('LUGARES RECIBIDOS:', respuesta);
  console.log('ES ARRAY:', Array.isArray(respuesta));

  this.lugares = respuesta;
  this.cargandoLugares = false;

  console.log(
    'CARGANDO DESPUÉS:',
    this.cargandoLugares
  );

  console.log(
    'LUGARES EN COMPONENTE:',
    this.lugares
  );

  this.cdr.detectChanges();
},

        error: error => {

  console.error(error);

  this.cargandoLugares = false;

  this.error =
    error?.error?.mensaje ??
    'No se pudieron cargar los lugares.';

  this.cdr.detectChanges();
}
      });
  }

  buscarViajes(): void {

    this.mensaje = '';
    this.error = '';
    this.viajes = [];
    this.viajeSeleccionado = null;
    this.asientosDisponibles = [];
    this.asientoSeleccionado = null;
    this.reservaCreada = null;
    this.modalReservaAbierto = false;

    if (!this.origenLugarId) {
      this.error = 'Seleccione el origen.';
      return;
    }

    if (!this.destinoLugarId) {
      this.error = 'Seleccione el destino.';
      return;
    }

    if (this.origenLugarId === this.destinoLugarId) {
      this.error =
        'El origen y destino no pueden ser iguales.';
      return;
    }

    if (!this.fecha) {
      this.error = 'Seleccione la fecha del viaje.';
      return;
    }

    this.cargandoViajes = true;

    const params = {
      origenLugarId: this.origenLugarId,
      destinoLugarId: this.destinoLugarId,
      fecha: this.fecha
    };

    this.http
      .get<Viaje[]>(
        `${this.apiUrl}/viajes`,
        { params }
      )
      .subscribe({
        next: respuesta => {
          this.viajes = respuesta;
          this.cargandoViajes = false;

          if (respuesta.length === 0) {
            this.mensaje =
              'No existen viajes disponibles para los datos seleccionados.';
          } else {
            this.mensaje =
              `${respuesta.length} viaje(s) encontrado(s).`;
          }

          this.cdr.detectChanges();
        },

        error: error => {
          console.error(error);

          this.viajes = [];
          this.cargandoViajes = false;

          this.error =
            error?.error?.mensaje ??
            'No se pudieron consultar los viajes.';

          this.cdr.detectChanges();
        }
      });
  }

  verAsientos(viaje: Viaje, abrirModal = true): void {
    this.error = '';
    this.viajeSeleccionado = viaje;
    this.modalAsientosAbierto = abrirModal;
    this.asientosDisponibles = [];
    this.asientoSeleccionado = null;
    this.cargandoAsientos = true;

    const params = {
      viajeId: viaje.viajeId,
      origenRutaParadaId: viaje.origenRutaParadaId,
      destinoRutaParadaId: viaje.destinoRutaParadaId
    };

    this.http
      .get<RespuestaDisponibilidad>(this.apiUrl, { params })
      .subscribe({
        next: respuesta => {
          this.asientosDisponibles = respuesta.asientos;
          this.cargandoAsientos = false;
          this.cdr.detectChanges();
        },
        error: error => {
          this.cargandoAsientos = false;
          this.error =
            error?.error?.mensaje ??
            'No se pudieron consultar los asientos de este viaje.';
          this.cdr.detectChanges();
        }
      });
  }

  cerrarModalAsientos(): void {
    this.modalAsientosAbierto = false;
    this.asientoSeleccionado = null;
  }

  cerrarModalReserva(): void {
    this.modalReservaAbierto = false;
  }

  seleccionarAsiento(asiento: AsientoDisponible): void {
    this.asientoSeleccionado = asiento;
    this.documentoPasajero = '';
    this.pasajeroEncontrado = null;
  }


  reservarAsiento(): void {
    if (!this.viajeSeleccionado || !this.asientoSeleccionado) {
      this.error = 'Seleccione un viaje y un asiento.';
      return;
    }

    const documento = this.documentoPasajero.trim();
    if (!documento) {
      this.error = 'Ingrese el número de cédula o documento del pasajero.';
      return;
    }

    const viaje = this.viajeSeleccionado;
    const asiento = this.asientoSeleccionado;

    this.error = '';
    this.mensaje = '';
    this.reservando = true;

    this.http
      .get<PasajeroEncontrado>(
        `${this.ventasApiUrl}/pasajeros/documento/${encodeURIComponent(documento)}`
      )
      .subscribe({
        next: pasajero => {
          this.pasajeroEncontrado = pasajero;
          const solicitud = {
            viajeId: viaje.viajeId,
            usuarioClienteId: null,
            usuarioVendedorId: null,
            canal: 'OFICINA',
            minutosExpiracion: 15,
            asientos: [
              {
                pasajeroId: pasajero.pasajeroId,
                asientoBusId: asiento.asientoBusId,
                origenRutaParadaId: viaje.origenRutaParadaId,
                destinoRutaParadaId: viaje.destinoRutaParadaId
              }
            ]
          };

          this.http
            .post<ReservaResponse>(`${this.ventasApiUrl}/reservar`, solicitud)
            .subscribe({
              next: reserva => {
                this.reservaCreada = reserva;
                this.modalAsientosAbierto = false;
                this.modalReservaAbierto = true;
                this.documentoPasajero = '';
                this.pasajeroEncontrado = null;
                this.reservando = false;
                this.asientoSeleccionado = null;
                this.mensaje = `Reserva ${reserva.codigo} creada. Vence ${
                  new Date(reserva.expiraEn).toLocaleString('es-EC')
                }.`;
                this.verAsientos(viaje, false);
                this.cdr.detectChanges();
              },
              error: error => {
                this.reservando = false;
                this.error = error?.error?.mensaje ??
                  (typeof error?.error === 'string' ? error.error : null) ??
                  'No se pudo crear la reserva. Actualice la disponibilidad e intente de nuevo.';
                this.cdr.detectChanges();
              }
            });
        },
        error: error => {
          this.reservando = false;
          this.pasajeroEncontrado = null;
          this.error = error?.error?.mensaje ??
            'No encontramos un pasajero con esa cédula o documento.';
          this.cdr.detectChanges();
        }
      });
  }

  obtenerHora(fecha: string): string {
    return new Date(fecha).toLocaleTimeString(
      'es-EC',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }

  obtenerNombreLugar(id: number | null): string {

    const lugar = this.lugares.find(
      l => l.lugarId === id
    );

    return lugar?.nombre ?? '';
  }
}
