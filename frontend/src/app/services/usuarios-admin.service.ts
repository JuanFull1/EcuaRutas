import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ActualizarAdminUsuario,
  AdminRol,
  AdminUsuario,
  CooperativaResumen,
  CrearAdminUsuario,
  RestablecerPassword
} from '../models/admin-usuario.model';

import { API_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class UsuariosAdminService {

  private readonly http =
    inject(HttpClient);

  private readonly url =
    `${API_URL}/usuarios`;

  listar(
    busqueda?: string,
    rolId?: number | null,
    activo?: boolean | null
  ): Observable<AdminUsuario[]> {

    let params =
      new HttpParams();

    if (busqueda?.trim()) {
      params = params.set(
        'busqueda',
        busqueda.trim()
      );
    }

    if (rolId) {
      params = params.set(
        'rolId',
        rolId.toString()
      );
    }

    if (
      activo !== null &&
      activo !== undefined
    ) {
      params = params.set(
        'activo',
        activo.toString()
      );
    }

    return this.http.get<AdminUsuario[]>(
      this.url,
      { params }
    );
  }

  obtener(
    id: number
  ): Observable<AdminUsuario> {

    return this.http.get<AdminUsuario>(
      `${this.url}/${id}`
    );
  }

  crear(
    datos: CrearAdminUsuario
  ): Observable<AdminUsuario> {

    return this.http.post<AdminUsuario>(
      this.url,
      datos
    );
  }

  actualizar(
    id: number,
    datos: ActualizarAdminUsuario
  ): Observable<AdminUsuario> {

    return this.http.put<AdminUsuario>(
      `${this.url}/${id}`,
      datos
    );
  }

  cambiarEstado(
    id: number,
    activo: boolean
  ): Observable<{
    message: string;
    activo: boolean;
  }> {

    return this.http.patch<{
      message: string;
      activo: boolean;
    }>(
      `${this.url}/${id}/estado`,
      { activo }
    );
  }

  restablecerPassword(
    id: number,
    datos: RestablecerPassword
  ): Observable<{
    message: string;
  }> {

    return this.http.patch<{
      message: string;
    }>(
      `${this.url}/${id}/password`,
      datos
    );
  }

  listarRoles():
    Observable<AdminRol[]> {

    return this.http.get<AdminRol[]>(
      `${this.url}/roles`
    );
  }

  listarCooperativas():
    Observable<CooperativaResumen[]> {

    return this.http.get<
      CooperativaResumen[]
    >(
      `${this.url}/cooperativas`
    );
  }
}