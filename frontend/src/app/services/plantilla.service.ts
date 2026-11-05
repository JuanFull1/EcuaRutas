import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './api.config';
import {
  ActualizarTipoAsientoRequest,
  CrearTipoAsientoRequest,
  TipoAsiento
} from '../models/tipo-asiento.model';
import {
  ActualizarPlantillaBusRequest,
  CrearPlantillaBusRequest,
  PlantillaBus
} from '../models/plantilla-bus.model';
import { AsientoBus } from '../models/asiento-bus.model';
import {
  CrearAsientoPlantillaRequest,
  PlantillaAsiento
} from '../models/plantilla-asiento.model';

@Injectable({
  providedIn: 'root'
})
export class PlantillaService {

  private readonly url = `${API_URL}/plantillas`;

  constructor(
    private readonly http: HttpClient
  ) {}

  listarTiposAsiento(cooperativaId?: number): Observable<TipoAsiento[]> {
    return this.http.get<TipoAsiento[]>(
      `${API_URL}/tipos-asiento`,
      { params: this.paramsCooperativa(cooperativaId) }
    );
  }

  obtenerTipoAsiento(id: number): Observable<TipoAsiento> {
    return this.http.get<TipoAsiento>(`${API_URL}/tipos-asiento/${id}`);
  }

  crearTipoAsiento(request: CrearTipoAsientoRequest): Observable<TipoAsiento> {
    return this.http.post<TipoAsiento>(`${API_URL}/tipos-asiento`, request);
  }

  actualizarTipoAsiento(id: number, request: ActualizarTipoAsientoRequest): Observable<TipoAsiento> {
    return this.http.put<TipoAsiento>(`${API_URL}/tipos-asiento/${id}`, request);
  }

  desactivarTipoAsiento(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/tipos-asiento/${id}`);
  }

  listar(cooperativaId?: number): Observable<PlantillaBus[]> {
    return this.http.get<PlantillaBus[]>(
      this.url,
      { params: this.paramsCooperativa(cooperativaId) }
    );
  }

  obtener(id: number): Observable<PlantillaBus> {
    return this.http.get<PlantillaBus>(`${this.url}/${id}`);
  }

  crear(request: CrearPlantillaBusRequest): Observable<PlantillaBus> {
    return this.http.post<PlantillaBus>(this.url, request);
  }

  actualizar(id: number, request: ActualizarPlantillaBusRequest): Observable<PlantillaBus> {
    return this.http.put<PlantillaBus>(`${this.url}/${id}`, request);
  }

  obtenerDisposicion(plantillaId: number): Observable<PlantillaAsiento[]> {
    return this.http.get<PlantillaAsiento[]>(
      `${this.url}/${plantillaId}/asientos`
    );
  }

  definirDisposicion(
    plantillaId: number,
    asientos: CrearAsientoPlantillaRequest[]
  ): Observable<PlantillaAsiento[]> {
    return this.http.put<PlantillaAsiento[]>(
      `${this.url}/${plantillaId}/asientos`,
      asientos
    );
  }

  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  asignarABus(busId: number, plantillaId: number): Observable<void> {
    return this.http.put<void>(
      `${API_URL}/buses/${busId}/plantilla/${plantillaId}`,
      null
    );
  }

  listarAsientosDeBus(busId: number): Observable<AsientoBus[]> {
    return this.http.get<AsientoBus[]>(`${API_URL}/buses/${busId}/asientos`);
  }

  private paramsCooperativa(cooperativaId?: number): HttpParams {
    let params = new HttpParams();

    if (cooperativaId !== undefined) {
      params = params.set('cooperativaId', cooperativaId);
    }

    return params;
  }
}