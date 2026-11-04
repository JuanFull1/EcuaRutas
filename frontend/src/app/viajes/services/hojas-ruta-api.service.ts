import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CrearHojaRutaManual, GenerarHojasRutaAutomatica, HojaRuta, HojaRutaResumen, SustituirBus } from '../models/hoja-ruta.model';

const API = 'http://localhost:5268/api';
const hora = (h?: string | null): string | null => (h ? (h.length === 5 ? `${h}:00` : h) : null);

@Injectable({ providedIn: 'root' })
export class HojasRutaApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API}/hojas-ruta`;

  listar(f: { grupoBusId?: number | null; desde?: string; hasta?: string } = {}): Observable<HojaRutaResumen[]> {
    let params = new HttpParams();
    if (f.grupoBusId) params = params.set('grupoBusId', f.grupoBusId);
    if (f.desde) params = params.set('desde', f.desde);
    if (f.hasta) params = params.set('hasta', f.hasta);
    return this.http.get<HojaRutaResumen[]>(this.url, { params });
  }

  obtener(id: number): Observable<HojaRuta> {
    return this.http.get<HojaRuta>(`${this.url}/${id}`);
  }

  crearManual(dto: CrearHojaRutaManual): Observable<HojaRuta> {
    const cuerpo = { ...dto, detalles: dto.detalles.map(d => ({ ...d, horaProgramada: hora(d.horaProgramada) })) };
    return this.http.post<HojaRuta>(`${this.url}/manual`, cuerpo);
  }

  generarAutomatica(dto: GenerarHojasRutaAutomatica): Observable<HojaRuta[]> {
    const cuerpo = { ...dto, frecuencias: dto.frecuencias.map(f => ({ ...f, horaProgramada: hora(f.horaProgramada) })) };
    return this.http.post<HojaRuta[]>(`${this.url}/automatica`, cuerpo);
  }

  publicar(id: number): Observable<HojaRuta> {
    return this.http.post<HojaRuta>(`${this.url}/${id}/publicar`, {});
  }

  cerrar(id: number): Observable<HojaRuta> {
    return this.http.post<HojaRuta>(`${this.url}/${id}/cerrar`, {});
  }

  sustituirBus(id: number, detalleId: number, dto: SustituirBus): Observable<HojaRuta> {
    return this.http.post<HojaRuta>(`${this.url}/${id}/detalles/${detalleId}/sustituir-bus`, dto);
  }
}