import type { Feature, LineString } from 'geojson';

import { LugarDto } from '../../lugares/lugar.model';
import { RutaParadaDto } from '../../paradas/ruta-parada.model';
import { RutaDto } from '../../rutas/ruta.model';
import { coordenadasMapa, CoordenadasMapa } from '../lugares/lugar-geografico';

export interface PuntoRecorrido {
  clave: string;
  funcion: 'ORIGEN' | 'PARADA' | 'DESTINO';
  etiqueta: string;
  lugarId: number;
  lugar: LugarDto | null;
  coordenadas: CoordenadasMapa | null;
  parada: RutaParadaDto | null;
}

export interface RecorridoGeografico {
  rutaId: number;
  puntos: PuntoRecorrido[];
  linea: Feature<LineString> | null;
  avisos: string[];
}

export function construirRecorrido(ruta: RutaDto, paradas: readonly RutaParadaDto[], lugares: readonly LugarDto[]): RecorridoGeografico {
  const porId = new Map(lugares.map(lugar => [lugar.id, lugar]));
  const ordenadas = [...paradas].sort((a, b) => a.orden - b.orden || a.id - b.id);
  const punto = (funcion: PuntoRecorrido['funcion'], lugarId: number, parada: RutaParadaDto | null = null): PuntoRecorrido => {
    const lugar = porId.get(lugarId) ?? null;
    return {
      clave: parada ? `parada:${parada.id}` : funcion.toLowerCase(), funcion,
      etiqueta: parada ? `Parada · orden ${parada.orden}` : funcion === 'ORIGEN' ? 'Origen' : 'Destino',
      lugarId, lugar, coordenadas: coordenadasMapa(lugar?.ubicacion), parada
    };
  };
  const puntos = [punto('ORIGEN', ruta.origenLugarId), ...ordenadas.map(parada => punto('PARADA', parada.lugarId, parada)), punto('DESTINO', ruta.destinoLugarId)];
  const avisos: string[] = [];
  if (new Set(ordenadas.map(parada => parada.orden)).size !== ordenadas.length) avisos.push('Hay paradas con el mismo orden; no se puede determinar una secuencia única.');
  if (new Set(ordenadas.map(parada => parada.lugarId)).size !== ordenadas.length) avisos.push('Hay lugares repetidos entre las paradas de esta ruta.');
  if (ruta.origenLugarId === ruta.destinoLugarId) avisos.push('El origen y el destino referencian el mismo lugar.');
  if (ordenadas.some((parada, indice) =>
    (parada.lugarId === ruta.origenLugarId && indice !== 0) ||
    (parada.lugarId === ruta.destinoLugarId && indice !== ordenadas.length - 1))) {
    avisos.push('El origen o el destino aparece fuera de los extremos del orden de paradas.');
  }
  const secuenciaIncierta = avisos.length > 0;
  const sinUbicacion = puntos.filter(item => item.coordenadas === null).length;
  if (sinUbicacion) avisos.push(`${sinUbicacion} puntos del recorrido no tienen coordenadas válidas; se omiten del trazado.`);
  const secuencia: PuntoRecorrido[] = [];
  for (const item of puntos) {
    // Conserva todas las funciones en la lista; evita repetir el mismo extremo en la línea.
    if (secuencia.at(-1)?.lugarId !== item.lugarId) secuencia.push(item);
  }
  const coordenadas = secuencia.flatMap(item => item.coordenadas ? [item.coordenadas] : []);
  const distintas = new Set(coordenadas.map(item => `${item[0]},${item[1]}`));
  const linea: Feature<LineString> | null = !secuenciaIncierta && distintas.size >= 2
    ? { type: 'Feature', properties: { rutaId: ruta.id }, geometry: { type: 'LineString', coordinates: coordenadas } }
    : null;
  return { rutaId: ruta.id, puntos, linea, avisos };
}

function objeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function idValido(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0;
}

export function leerRutas(respuesta: unknown): RutaDto[] | null {
  if (!Array.isArray(respuesta)) return null;
  const ids = new Set<number>();
  for (const dato of respuesta) {
    if (!objeto(dato) || !idValido(dato['id']) || ids.has(dato['id']) || typeof dato['nombre'] !== 'string' ||
      !idValido(dato['origenLugarId']) || !idValido(dato['destinoLugarId']) || typeof dato['activa'] !== 'boolean' ||
      (dato['tipoViaje'] !== 'DIRECTO' && dato['tipoViaje'] !== 'CON_PARADAS')) return null;
    ids.add(dato['id']);
  }
  return respuesta as RutaDto[];
}

export function leerParadas(respuesta: unknown, rutaId: number): RutaParadaDto[] | null {
  if (!Array.isArray(respuesta)) return null;
  const ids = new Set<number>();
  for (const dato of respuesta) {
    if (!objeto(dato) || !idValido(dato['id']) || ids.has(dato['id']) || dato['rutaId'] !== rutaId ||
      !idValido(dato['lugarId']) || typeof dato['orden'] !== 'number' || !Number.isInteger(dato['orden']) || dato['orden'] < 0 || dato['orden'] > 2147483647 ||
      typeof dato['permiteAscenso'] !== 'boolean' || typeof dato['permiteDescenso'] !== 'boolean') return null;
    const km = dato['kmAcumulado'];
    const minutos = dato['minutosAcumulados'];
    if (!(km === null || (typeof km === 'number' && Number.isFinite(km) && Math.abs(km) <= 99999999.99 && Number(km.toFixed(2)) === km)) ||
      !(minutos === null || (typeof minutos === 'number' && Number.isInteger(minutos) && minutos >= -2147483648 && minutos <= 2147483647))) return null;
    ids.add(dato['id']);
  }
  return respuesta as RutaParadaDto[];
}
