import { inject } from '@angular/core';

import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router
} from '@angular/router';

import { AuthService } from '../services/auth.service';

import type {
  RolUsuario
} from '../models/usuario.model';

export const roleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
) => {

  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.estaAutenticado()) {
    return router.createUrlTree([
      '/login'
    ]);
  }

  const usuario =
    authService.usuarioActual();

  if (!usuario) {
    return router.createUrlTree([
      '/login'
    ]);
  }

  const rolesPermitidos =
    route.data['roles'] as
      | RolUsuario[]
      | undefined;

  if (
    !rolesPermitidos ||
    rolesPermitidos.length === 0
  ) {
    return true;
  }

  if (
    rolesPermitidos.includes(
      usuario.rol
    )
  ) {
    return true;
  }

  return router.createUrlTree([
    authService.obtenerRutaInicio(
      usuario.rol
    )
  ]);
};