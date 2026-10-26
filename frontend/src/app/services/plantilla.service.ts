import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './api.config';
import { TipoAsiento } from '../models/tipo-asiento.model';
import {
  CrearPlantillaBusRequest,
  PlantillaBus
} from '../models/plantilla-bus.model';
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

  asignarABus(busId: number, plantillaId: number): Observable<void> {
    return this.http.put<void>(
      `${API_URL}/buses/${busId}/plantilla/${plantillaId}`,
      null
    );
  }

  private paramsCooperativa(cooperativaId?: number): HttpParams {
    let params = new HttpParams();

    if (cooperativaId !== undefined) {
      params = params.set('cooperativaId', cooperativaId);
    }

    return params;
  }
}