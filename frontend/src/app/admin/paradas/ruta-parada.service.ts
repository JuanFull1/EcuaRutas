import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../services/api.config';
import { ActualizarRutaParadaDto, CrearRutaParadaDto, RutaParadaDto } from './ruta-parada.model';

@Injectable({ providedIn: 'root' })
export class RutaParadaService {
  private readonly http = inject(HttpClient);

  private url(rutaId: number): string {
    return `${API_URL}/rutas/${rutaId}/paradas`;
  }

  listar(rutaId: number): Observable<RutaParadaDto[]> {
    return this.http.get<RutaParadaDto[]>(this.url(rutaId));
  }

  obtener(rutaId: number, id: number): Observable<RutaParadaDto> {
    return this.http.get<RutaParadaDto>(`${this.url(rutaId)}/${id}`);
  }

  crear(rutaId: number, request: CrearRutaParadaDto): Observable<RutaParadaDto> {
    return this.http.post<RutaParadaDto>(this.url(rutaId), request);
  }

  actualizar(rutaId: number, id: number, request: ActualizarRutaParadaDto): Observable<RutaParadaDto> {
    return this.http.put<RutaParadaDto>(`${this.url(rutaId)}/${id}`, request);
  }

  eliminar(rutaId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.url(rutaId)}/${id}`);
  }
}
