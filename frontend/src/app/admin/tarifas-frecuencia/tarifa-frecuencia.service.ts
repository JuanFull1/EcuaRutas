import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../services/api.config';
import { ActualizarTarifaFrecuenciaDto, CrearTarifaFrecuenciaDto, TarifaFrecuenciaDto } from './tarifa-frecuencia.model';

@Injectable({ providedIn: 'root' })
export class TarifaFrecuenciaService {
  private readonly http = inject(HttpClient);
  private url(frecuenciaId: number): string { return `${API_URL}/frecuencias/${frecuenciaId}/tarifas`; }
  listar(frecuenciaId: number): Observable<TarifaFrecuenciaDto[]> { return this.http.get<TarifaFrecuenciaDto[]>(this.url(frecuenciaId)); }
  obtener(frecuenciaId: number, id: number): Observable<TarifaFrecuenciaDto> { return this.http.get<TarifaFrecuenciaDto>(`${this.url(frecuenciaId)}/${id}`); }
  crear(frecuenciaId: number, datos: CrearTarifaFrecuenciaDto): Observable<TarifaFrecuenciaDto> { return this.http.post<TarifaFrecuenciaDto>(this.url(frecuenciaId), datos); }
  actualizar(frecuenciaId: number, id: number, datos: ActualizarTarifaFrecuenciaDto): Observable<TarifaFrecuenciaDto> { return this.http.put<TarifaFrecuenciaDto>(`${this.url(frecuenciaId)}/${id}`, datos); }
  darDeBaja(frecuenciaId: number, id: number): Observable<void> { return this.http.delete<void>(`${this.url(frecuenciaId)}/${id}`); }
}
