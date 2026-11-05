import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './api.config';
import {
  ActualizarBusRequest,
  Bus,
  CrearBusRequest,
  EstadoBus
} from '../models/bus.model';

@Injectable({
  providedIn: 'root'
})
export class BusService {

  private readonly url = `${API_URL}/buses`;

  constructor(
    private readonly http: HttpClient
  ) {}

  listar(
    cooperativaId: number,
    grupoBusId?: number,
    estado?: EstadoBus
  ): Observable<Bus[]> {

    let params = new HttpParams().set('cooperativaId', cooperativaId);

    if (grupoBusId !== undefined) {
      params = params.set('grupoBusId', grupoBusId);
    }

    if (estado) {
      params = params.set('estado', estado);
    }

    return this.http.get<Bus[]>(this.url, { params });
  }

  obtener(id: number): Observable<Bus> {
    return this.http.get<Bus>(`${this.url}/${id}`);
  }

  crear(request: CrearBusRequest): Observable<Bus> {
    return this.http.post<Bus>(this.url, request);
  }

  actualizar(id: number, request: ActualizarBusRequest): Observable<Bus> {
    return this.http.put<Bus>(`${this.url}/${id}`, request);
  }

  darDeBaja(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}