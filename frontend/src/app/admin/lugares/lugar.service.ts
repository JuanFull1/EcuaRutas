import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../services/api.config';
import { ActualizarLugarDto, CrearLugarDto, LugarDto } from './lugar.model';

@Injectable({ providedIn: 'root' })
export class LugarService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/lugares`;

  listar(): Observable<LugarDto[]> {
    return this.http.get<LugarDto[]>(this.url);
  }

  obtener(id: number): Observable<LugarDto> {
    return this.http.get<LugarDto>(`${this.url}/${id}`);
  }

  crear(request: CrearLugarDto): Observable<LugarDto> {
    return this.http.post<LugarDto>(this.url, request);
  }

  actualizar(id: number, request: ActualizarLugarDto): Observable<LugarDto> {
    return this.http.put<LugarDto>(`${this.url}/${id}`, request);
  }

  darDeBaja(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
