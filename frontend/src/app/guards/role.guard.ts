import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router
} from '@angular/router';

import { AuthService } from '../services/auth.service';
import { Usuario } from '../models/usuario.model';

export const roleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
) => {

  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.estaAutenticado()) {
    return router.createUrlTree(['/login']);
  }

  const rolesPermitidos =
    route.data['roles'] as Usuario['rol'][] | undefined;

  if (
    !rolesPermitidos ||
    rolesPermitidos.length === 0
  ) {
    return true;
  }

  const usuario =
    authService.usuarioActual();

  if (
    usuario &&
    rolesPermitidos.includes(usuario.rol)
  ) {
    return true;
  }

  return router.createUrlTree(['/login']);
};