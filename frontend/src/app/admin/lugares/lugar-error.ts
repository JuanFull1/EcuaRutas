import { HttpErrorResponse } from '@angular/common/http';

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function detalleValidacion(cuerpo: unknown): string {
  if (!esObjeto(cuerpo)) return '';
  if (typeof cuerpo['mensaje'] === 'string') return cuerpo['mensaje'];
  if (esObjeto(cuerpo['errors'])) {
    return Object.values(cuerpo['errors'])
      .flatMap(valor => Array.isArray(valor) ? valor : [])
      .filter((valor): valor is string => typeof valor === 'string')
      .join(' ');
  }
  return typeof cuerpo['detail'] === 'string' ? cuerpo['detail'] : '';
}

export function mensajeErrorLugar(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Ocurrió un error inesperado al procesar la operación. Inténtalo de nuevo.';
  }

  const detalle = detalleValidacion(error.error);
  switch (error.status) {
    case 0:
      return 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';
    case 400:
      return detalle || 'Revisa los datos ingresados: hay valores que no son válidos.';
    case 401:
      return 'Tu sesión no es válida o ha expirado. Inicia sesión nuevamente.';
    case 403:
      return 'No tienes permisos para realizar esta operación. La escritura requiere el rol ADMIN.';
    case 404:
      return detalle || 'El recurso solicitado no está disponible. Actualiza el listado e inténtalo de nuevo.';
    case 409:
      return detalle || 'No se puede completar la operación porque existe un conflicto con los datos actuales.';
    default:
      return error.status >= 500
        ? 'El servidor no pudo completar la operación. Inténtalo de nuevo más tarde.'
        : `La operación devolvió una respuesta inesperada (HTTP ${error.status}). Inténtalo de nuevo.`;
  }
}
