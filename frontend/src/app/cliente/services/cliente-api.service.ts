
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_URL } from '../../services/api.config';

export interface LugarCliente {
  lugarId: number;
  nombre: string;
  provincia?: string;
  canton?: string;
}

export interface ViajeCliente {
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

export interface AsientoDisponibleCliente {
  asientoBusId: number;
  numero: string;
  piso: number;
  tipoAsiento: string;
  precioFinal: number;
}

export interface ReservaClienteRequest {
  viajeId: number;
  asientoBusId: number;
  origenRutaParadaId: number;
  destinoRutaParadaId: number;
  documento: string;
}

export interface ReservaClienteResponse {
  codigo: string;
  estado: string;
  total: number;
  expiraEn: string;
}

export interface ResumenCompraCliente {
  ventaId: number;
  codigo: string;
  viajeId: number;
  estado: string;
  canal: string;
  subtotal: number;
  descuentoTotal: number;
  total: number;
  creadoEn: string;
  expiraEn: string | null;
}

export interface DetalleBoletoCliente {
  boletoId: number;
  ventaId: number;
  codigoVenta: string;
  codigoBoleto: string;
  estadoBoleto: string;
  generadoEn: string;
  archivoUrl: string | null;
  qrToken: string;
  viajeId: number;
  rutaNombre: string;
  origen: string;
  destino: string;
  salidaProgramada: string;
  pasajeroId: number;
  pasajero: string;
  asientoBusId: number;
  numeroAsiento: string;
  precioFinal: number;
}

export interface NotificacionCliente {
  id: number;
  ventaId: number | null;
  tipo: string;
  asunto: string;
  estado: string;
  creadoEn: string;
  enviadoEn: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ClienteApiService {

  private readonly http = inject(HttpClient);

  private readonly clienteUrl = `${API_URL}/cliente`;
  private readonly disponibilidadUrl = `${API_URL}/Disponibilidad`;

  obtenerLugares(): Observable<LugarCliente[]> {
    return this.http.get<LugarCliente[]>(
      `${this.disponibilidadUrl}/lugares`
    );
  }

  obtenerBoletos(): Observable<DetalleBoletoCliente[]> {
    return this.http.get<DetalleBoletoCliente[]>(
      `${this.clienteUrl}/boletos`
    );
  }

  obtenerAsientosDisponibles(viaje: ViajeCliente): Observable<{ asientos: AsientoDisponibleCliente[] }> {
    const params = new HttpParams()
      .set('viajeId', viaje.viajeId.toString())
      .set('origenRutaParadaId', viaje.origenRutaParadaId.toString())
      .set('destinoRutaParadaId', viaje.destinoRutaParadaId.toString());
    return this.http.get<{ asientos: AsientoDisponibleCliente[] }>(this.disponibilidadUrl, { params });
  }

  crearReservaCliente(request: ReservaClienteRequest): Observable<ReservaClienteResponse> {
    return this.http.post<ReservaClienteResponse>(`${this.clienteUrl}/reservas`, request);
  }

  obtenerNotificaciones(): Observable<NotificacionCliente[]> {
    return this.http.get<NotificacionCliente[]>(
      `${API_URL}/notificaciones`
    );
  }

  buscarViajes(
    origenLugarId: number,
    destinoLugarId: number,
    fecha: string
  ): Observable<ViajeCliente[]> {

    const params = new HttpParams()
      .set('OrigenLugarId', origenLugarId.toString())
      .set('DestinoLugarId', destinoLugarId.toString())
      .set('Fecha', fecha);

    return this.http.get<ViajeCliente[]>(
      `${this.clienteUrl}/viajes`,
      { params }
    );
  }

  obtenerHistorial(): Observable<ResumenCompraCliente[]> {
    return this.http.get<ResumenCompraCliente[]>(
      `${this.clienteUrl}/historial`
    );
  }

}
