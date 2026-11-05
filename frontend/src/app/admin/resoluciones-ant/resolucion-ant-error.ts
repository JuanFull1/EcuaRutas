import { HttpErrorResponse } from '@angular/common/http';
import { mensajeError } from '../../shared/http-error';

export function mensajeErrorResolucion(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  // Los detalles del servidor solo se presentan para errores de negocio conocidos.
  // El interceptor existente adjunta JWT y no muestra notificaciones de error.
  switch (error.status) {
    case 0: return 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';
    case 400: return mensajeError(error, 'Revisa los datos ingresados: hay valores que no son válidos.');
    case 401: return 'Tu sesión no es válida o ha expirado. Inicia sesión nuevamente.';
    case 403: return 'No tienes permisos para gestionar resoluciones ANT. Se requiere una sesión válida con rol COOPERATIVA.';
    case 404: return mensajeError(error, 'La resolución o la cooperativa solicitada no está disponible. Actualiza el listado.');
    case 409: return mensajeError(error, 'No se pudo completar la operación por un conflicto con los datos actuales.');
    default: return error.status >= 500
      ? 'El servidor no pudo completar la operación. Inténtalo de nuevo más tarde.'
      : 'La operación devolvió una respuesta inesperada. Inténtalo de nuevo.';
  }
}

// El contrato permite cadenas sin validar esquema. Se conservan al guardar,
// pero únicamente las direcciones HTTP(S) se ofrecen como enlaces navegables.
export function enlaceDocumento(valor: string | null): string | null {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
