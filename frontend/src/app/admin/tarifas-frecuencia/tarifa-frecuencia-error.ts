import { HttpErrorResponse } from '@angular/common/http';
import { mensajeError } from '../../shared/http-error';

export function mensajeErrorTarifa(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  switch (error.status) {
    case 0: return 'No se pudo conectar con el servidor. Verifica tu conexión.';
    case 400: return mensajeError(error, 'Revisa el tramo y el precio ingresados.');
    case 401: return 'Tu sesión no es válida o ha expirado. Inicia sesión nuevamente.';
    case 403: return 'No tienes permisos para gestionar tarifas. Se requiere una sesión válida con rol COOPERATIVA.';
    case 404: return mensajeError(error, 'La tarifa, frecuencia o referencia solicitada no está disponible.');
    case 409: return mensajeError(error, 'Existe un conflicto con los datos actuales; el tramo puede tener una tarifa incluso inactiva.');
    default: return error.status >= 500 ? 'El servidor no pudo completar la operación. Inténtalo de nuevo más tarde.'
      : 'La operación devolvió una respuesta inesperada. Inténtalo de nuevo.';
  }
}

