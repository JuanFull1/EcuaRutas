import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../services/api.config';
import { ActualizarFrecuenciaDto, CrearFrecuenciaDto, FrecuenciaDto } from './frecuencia.model';

@Injectable({ providedIn: 'root' })
export class FrecuenciaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/frecuencias`;

  listar(cooperativaId?: number, rutaId?: number): Observable<FrecuenciaDto[]> {
    let params = new HttpParams();
    if (cooperativaId !== undefined) params = params.set('cooperativaId', cooperativaId);
    if (rutaId !== undefined) params = params.set('rutaId', rutaId);
    return this.http.get<FrecuenciaDto[]>(this.url, { params });
  }
  obtener(id: number): Observable<FrecuenciaDto> { return this.http.get<FrecuenciaDto>(`${this.url}/${id}`); }
  crear(datos: CrearFrecuenciaDto): Observable<FrecuenciaDto> { return this.http.post<FrecuenciaDto>(this.url, datos); }
  actualizar(id: number, datos: ActualizarFrecuenciaDto): Observable<FrecuenciaDto> { return this.http.put<FrecuenciaDto>(`${this.url}/${id}`, datos); }
  darDeBaja(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
}
