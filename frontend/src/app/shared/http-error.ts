import { HttpErrorResponse } from '@angular/common/http';

export function mensajeError(e: unknown, porDefecto = 'Ocurrió un error inesperado.'): string {
  if (!(e instanceof HttpErrorResponse)) return porDefecto;
  if (e.status === 0) return 'No se pudo conectar con el servidor.';
  const body = e.error;
  if (body?.mensaje) return body.mensaje;
  if (body?.errors) {
    const primero = Object.values(body.errors as Record<string, string[]>)[0];
    if (primero?.length) return primero[0];
  }
  if (e.status === 403) return 'No tienes permiso para esta acción.';
  return porDefecto;
}