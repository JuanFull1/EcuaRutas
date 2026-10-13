import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Usuario } from '../models/usuario.model';
import {
  inicializarUsuariosDemo,
  obtenerUsuariosDemo
} from '../auth/usuarios-demo';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly SESSION_KEY = 'ecuarutas_usuario_actual';

  private readonly usuarioSignal = signal<Usuario | null>(
    this.obtenerSesionGuardada()
  );

  readonly usuarioActual = this.usuarioSignal.asReadonly();

  constructor(
    private readonly router: Router
  ) {
    inicializarUsuariosDemo();
  }

  login(correo: string, password: string): boolean {

    const usuarios = obtenerUsuariosDemo();

    const usuario = usuarios.find(
      u =>
        u.correo.toLowerCase() === correo.toLowerCase().trim()
        && u.password === password
    );

    if (!usuario) {
      return false;
    }

    localStorage.setItem(
      this.SESSION_KEY,
      JSON.stringify(usuario)
    );

    this.usuarioSignal.set(usuario);

    return true;
  }

  logout(): void {

    localStorage.removeItem(this.SESSION_KEY);

    this.usuarioSignal.set(null);

    this.router.navigate(['/login']);
  }

  estaAutenticado(): boolean {
    return this.usuarioSignal() !== null;
  }

  tieneRol(rol: Usuario['rol']): boolean {
    return this.usuarioSignal()?.rol === rol;
  }

  private obtenerSesionGuardada(): Usuario | null {

    const datos = localStorage.getItem(this.SESSION_KEY);

    if (!datos) {
      return null;
    }

    try {
      return JSON.parse(datos) as Usuario;
    } catch {
      localStorage.removeItem(this.SESSION_KEY);
      return null;
    }
  }
}