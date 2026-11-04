import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../services/api.config';
import { ActualizarResolucionAntDto, CrearResolucionAntDto, ResolucionAntDto } from './resolucion-ant.model';

@Injectable({ providedIn: 'root' })
export class ResolucionAntService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/resoluciones-ant`;

  listar(): Observable<ResolucionAntDto[]> {
    return this.http.get<ResolucionAntDto[]>(this.url);
  }

  obtener(id: number): Observable<ResolucionAntDto> {
    return this.http.get<ResolucionAntDto>(`${this.url}/${id}`);
  }

  crear(datos: CrearResolucionAntDto): Observable<ResolucionAntDto> {
    return this.http.post<ResolucionAntDto>(this.url, datos);
  }

  actualizar(id: number, datos: ActualizarResolucionAntDto): Observable<ResolucionAntDto> {
    return this.http.put<ResolucionAntDto>(`${this.url}/${id}`, datos);
  }

  darDeBaja(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
