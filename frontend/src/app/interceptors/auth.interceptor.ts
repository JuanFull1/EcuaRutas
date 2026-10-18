import {
  HttpInterceptorFn
} from '@angular/common/http';

import {
  AUTH_SESSION_KEY
} from '../services/auth.service';

import {
  LoginResponse
} from '../models/usuario.model';

export const authInterceptor:
  HttpInterceptorFn = (req, next) => {

    const datos =
      localStorage.getItem(
        AUTH_SESSION_KEY
      );

    if (!datos) {
      return next(req);
    }

    try {

      const sesion =
        JSON.parse(datos) as LoginResponse;

      if (!sesion.token) {
        return next(req);
      }

      const requestConToken =
        req.clone({
          setHeaders: {
            Authorization:
              `Bearer ${sesion.token}`
          }
        });

      return next(requestConToken);

    }
    catch {

      localStorage.removeItem(
        AUTH_SESSION_KEY
      );

      return next(req);
    }
  };