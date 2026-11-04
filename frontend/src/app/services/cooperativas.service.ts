import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  inject,
  Injectable
} from '@angular/core';

import {
  Observable
} from 'rxjs';

import {
  ActualizarCooperativaAdmin,
  ActualizarMiCooperativa,
  Cooperativa,
  CrearCooperativa,
  CrearCooperativaResponse
} from '../models/cooperativa.model';

import {
  API_URL
} from './api.config';

@Injectable({
  providedIn: 'root'
})
export class CooperativasService {

  private readonly http =
    inject(HttpClient);

  private readonly url =
    `${API_URL}/cooperativas`;

  private readonly backendUrl =
    API_URL.replace(
      /\/api\/?$/,
      ''
    );

  listarAdmin(
    busqueda?: string,
    activa?: boolean | null
  ): Observable<Cooperativa[]> {

    let params =
      new HttpParams();

    if (
      busqueda?.trim()
    ) {
      params =
        params.set(
          'busqueda',
          busqueda.trim()
        );
    }

    if (
      activa !== null &&
      activa !== undefined
    ) {
      params =
        params.set(
          'activa',
          activa.toString()
        );
    }

    return this.http.get<
      Cooperativa[]
    >(
      `${this.url}/admin`,
      {
        params
      }
    );
  }

  obtenerAdmin(
    id: number
  ): Observable<Cooperativa> {

    return this.http.get<
      Cooperativa
    >(
      `${this.url}/admin/${id}`
    );
  }

  crearAdmin(
    datos: CrearCooperativa
  ): Observable<
    CrearCooperativaResponse
  > {

    return this.http.post<
      CrearCooperativaResponse
    >(
      `${this.url}/admin`,
      datos
    );
  }

  actualizarAdmin(
    id: number,
    datos: ActualizarCooperativaAdmin
  ): Observable<Cooperativa> {

    return this.http.put<
      Cooperativa
    >(
      `${this.url}/admin/${id}`,
      datos
    );
  }

  cambiarEstado(
    id: number,
    activa: boolean
  ): Observable<{
    message: string;
    activa: boolean;
  }> {

    return this.http.patch<{
      message: string;
      activa: boolean;
    }>(
      `${this.url}/admin/${id}/estado`,
      {
        activa
      }
    );
  }

  obtenerMiCooperativa():
    Observable<Cooperativa> {

    return this.http.get<
      Cooperativa
    >(
      `${this.url}/mi-cooperativa`
    );
  }

  actualizarMiCooperativa(
    datos: ActualizarMiCooperativa
  ): Observable<Cooperativa> {

    return this.http.put<
      Cooperativa
    >(
      `${this.url}/mi-cooperativa`,
      datos
    );
  }

  subirLogo(
    archivo: File
  ): Observable<Cooperativa> {

    const formData =
      new FormData();

    formData.append(
      'archivo',
      archivo
    );

    return this.http.post<
      Cooperativa
    >(
      `${this.url}/mi-cooperativa/logo`,
      formData
    );
  }

  resolverLogoUrl(
    ruta:
      string |
      null |
      undefined
  ): string {

    if (!ruta) {
      return '';
    }

    if (
      ruta.startsWith(
        'http://'
      ) ||
      ruta.startsWith(
        'https://'
      )
    ) {
      return ruta;
    }

    return `${
      this.backendUrl
    }${
      ruta.startsWith('/')
        ? ruta
        : `/${ruta}`
    }`;
  }
}