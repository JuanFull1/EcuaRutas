import { LugarDto } from '../../lugares/lugar.model';

export type CoordenadasMapa = [longitud: number, latitud: number];

export function coordenadasMapa(ubicacion: unknown): CoordenadasMapa | null {
  if (typeof ubicacion !== 'object' || ubicacion === null) return null;
  const dato = ubicacion as Record<string, unknown>;
  const longitud = dato['longitud'];
  const latitud = dato['latitud'];
  return typeof longitud === 'number' && Number.isFinite(longitud) && longitud >= -180 && longitud <= 180 &&
    typeof latitud === 'number' && Number.isFinite(latitud) && latitud >= -90 && latitud <= 90
    ? [longitud, latitud] : null;
}

// Comprueba la estructura de consulta sin descartar los lugares con ubicación inválida.
// Esos lugares siguen disponibles para consulta y se presentan sin marcador.
export function leerLugares(respuesta: unknown): LugarDto[] | null {
  if (!Array.isArray(respuesta)) return null;
  const lugares = new Map<number, LugarDto>();
  for (const dato of respuesta) {
    if (typeof dato !== 'object' || dato === null) return null;
    const lugar = dato as Record<string, unknown>;
    if (typeof lugar['id'] !== 'number' || !Number.isInteger(lugar['id']) || lugar['id'] <= 0 ||
      typeof lugar['nombre'] !== 'string' || typeof lugar['activo'] !== 'boolean' ||
      typeof lugar['tipo'] !== 'string' || !['CIUDAD', 'TERMINAL', 'PARADA'].includes(lugar['tipo']) ||
      !(lugar['provincia'] === null || typeof lugar['provincia'] === 'string') ||
      !(lugar['canton'] === null || typeof lugar['canton'] === 'string')) return null;
    // La ubicación se verifica al utilizarla; no se convierte ni se reemplaza por un punto ficticio.
    lugares.set(lugar['id'], dato as LugarDto);
  }
  return [...lugares.values()];
}
