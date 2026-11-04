import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../services/api.config';
import { ActualizarRutaDto, CrearRutaDto, RutaDto } from './ruta.model';

@Injectable({ providedIn: 'root' })
export class RutaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/rutas`;

  listar(): Observable<RutaDto[]> {
    return this.http.get<RutaDto[]>(this.url);
  }

  obtener(id: number): Observable<RutaDto> {
    return this.http.get<RutaDto>(`${this.url}/${id}`);
  }

  crear(request: CrearRutaDto): Observable<RutaDto> {
    return this.http.post<RutaDto>(this.url, request);
  }

  actualizar(id: number, request: ActualizarRutaDto): Observable<RutaDto> {
    return this.http.put<RutaDto>(`${this.url}/${id}`, request);
  }

  darDeBaja(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
