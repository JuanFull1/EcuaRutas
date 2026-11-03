import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EstadoViaje, FiltroViajes, Viaje } from '../models/viaje.model';

const API = 'http://localhost:5268/api';

@Injectable({ providedIn: 'root' })
export class ViajesApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API}/viajes`;

  listar(f: FiltroViajes = {}): Observable<Viaje[]> {
    let params = new HttpParams();
    if (f.desde) params = params.set('desde', f.desde);
    if (f.hasta) params = params.set('hasta', f.hasta);
    if (f.estado) params = params.set('estado', f.estado);
    if (f.busId) params = params.set('busId', f.busId);
    return this.http.get<Viaje[]>(this.url, { params });
  }

  cambiarEstado(id: number, estado: EstadoViaje): Observable<Viaje> {
    return this.http.patch<Viaje>(`${this.url}/${id}/estado`, { estado });
  }

  reasignarUsuarioBus(id: number, usuarioBusId: number): Observable<Viaje> {
    return this.http.put<Viaje>(`${this.url}/${id}/usuario-bus`, { usuarioBusId });
  }

  cancelar(id: number): Observable<Viaje> {
    return this.http.post<Viaje>(`${this.url}/${id}/cancelar`, {});
  }

  generarDesdeHoja(hojaRutaId: number): Observable<Viaje[]> {
    return this.http.post<Viaje[]>(`${this.url}/generar-desde-hoja/${hojaRutaId}`, {});
  }
}