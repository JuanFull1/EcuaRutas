import {
  computed,
  Injectable,
  signal
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable,
  tap
} from 'rxjs';

import {
  Router
} from '@angular/router';

import {
  LoginResponse,
  RolUsuario,
  Usuario
} from '../models/usuario.model';

export const AUTH_SESSION_KEY =
  'ecuarutas_sesion';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly apiUrl =
    'http://localhost:5268/api/auth';

  private readonly sesionSignal =
    signal<LoginResponse | null>(
      this.obtenerSesionGuardada()
    );

  readonly usuarioActual =
    computed<Usuario | null>(
      () =>
        this.sesionSignal()?.usuario
        ?? null
    );

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  login(
    correo: string,
    password: string
  ): Observable<LoginResponse> {

    return this.http
      .post<LoginResponse>(
        `${this.apiUrl}/login`,
        {
          correo,
          password
        }
      )
      .pipe(
        tap(respuesta => {

          localStorage.setItem(
            AUTH_SESSION_KEY,
            JSON.stringify(respuesta)
          );

          this.sesionSignal.set(
            respuesta
          );

        })
      );
  }

  logout(): void {

    this.cerrarSesionLocal();

    this.router.navigate([
      '/login'
    ]);
  }

  estaAutenticado(): boolean {

    const sesion =
      this.sesionSignal();

    if (!sesion) {
      return false;
    }

    const expiraEn =
      new Date(
        sesion.expiraEn
      ).getTime();

    if (
      Number.isNaN(expiraEn) ||
      expiraEn <= Date.now()
    ) {

      this.cerrarSesionLocal();

      return false;
    }

    return true;
  }

  tieneRol(
    rol: RolUsuario
  ): boolean {

    return (
      this.estaAutenticado() &&
      this.usuarioActual()?.rol === rol
    );
  }

  obtenerToken(): string | null {

    if (!this.estaAutenticado()) {
      return null;
    }

    return (
      this.sesionSignal()?.token
      ?? null
    );
  }

  obtenerRutaInicio(
    rol: RolUsuario
  ): string {

    switch (rol) {

      case 'ADMIN':
        return '/admin/inicio';

      case 'COOPERATIVA':
        return '/cooperativas/inicio';

      case 'OFICINISTA':
        return '/ventas/inicio';

      case 'CLIENTE':
        return '/cliente/inicio';

      case 'BUS':
        return '/personal-bus/inicio';

      default:
        return '/login';
    }
  }

  private obtenerSesionGuardada():
    LoginResponse | null {

    const datos =
      localStorage.getItem(
        AUTH_SESSION_KEY
      );

    if (!datos) {
      return null;
    }

    try {

      return JSON.parse(
        datos
      ) as LoginResponse;

    }
    catch {

      localStorage.removeItem(
        AUTH_SESSION_KEY
      );

      return null;
    }
  }

  private cerrarSesionLocal(): void {

    localStorage.removeItem(
      AUTH_SESSION_KEY
    );

    this.sesionSignal.set(null);
  }
}