
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
  viajeId: number;
  salidaProgramada: string;
  pasajeroId: number;
  asientoBusId: number;
  precioFinal: number;
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
