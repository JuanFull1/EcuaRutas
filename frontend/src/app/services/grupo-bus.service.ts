import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './api.config';
import {
  ActualizarGrupoBusRequest,
  CrearGrupoBusRequest,
  GrupoBus
} from '../models/grupo-bus.model';

@Injectable({
  providedIn: 'root'
})
export class GrupoBusService {

  private readonly url = `${API_URL}/grupos-buses`;

  constructor(
    private readonly http: HttpClient
  ) {}

  listar(cooperativaId: number): Observable<GrupoBus[]> {
    const params = new HttpParams().set('cooperativaId', cooperativaId);
    return this.http.get<GrupoBus[]>(this.url, { params });
  }

  obtener(id: number): Observable<GrupoBus> {
    return this.http.get<GrupoBus>(`${this.url}/${id}`);
  }

  crear(request: CrearGrupoBusRequest): Observable<GrupoBus> {
    return this.http.post<GrupoBus>(this.url, request);
  }

  actualizar(id: number, request: ActualizarGrupoBusRequest): Observable<GrupoBus> {
    return this.http.put<GrupoBus>(`${this.url}/${id}`, request);
  }

  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}