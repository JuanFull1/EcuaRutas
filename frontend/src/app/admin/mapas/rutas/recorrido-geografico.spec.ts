import { LugarDto } from '../../lugares/lugar.model';
import { RutaParadaDto } from '../../paradas/ruta-parada.model';
import { RutaDto } from '../../rutas/ruta.model';
import { construirRecorrido, leerParadas, leerRutas } from './recorrido-geografico';

const ruta: RutaDto = { id: 7, nombre: 'Quito – Cuenca', origenLugarId: 11, destinoLugarId: 33, tipoViaje: 'CON_PARADAS', activa: true };
const lugares: LugarDto[] = [
  { id: 11, nombre: 'Quito', provincia: null, canton: null, tipo: 'CIUDAD', activo: true, ubicacion: { longitud: -78.46, latitud: -0.18 } },
  { id: 22, nombre: 'Ambato', provincia: null, canton: null, tipo: 'PARADA', activo: true, ubicacion: { longitud: -78.62, latitud: -1.24 } },
  { id: 33, nombre: 'Cuenca', provincia: null, canton: null, tipo: 'TERMINAL', activo: false, ubicacion: { longitud: -79, latitud: -2.9 } }
];
const parada: RutaParadaDto = { id: 101, rutaId: 7, lugarId: 22, orden: 2, kmAcumulado: 0, minutosAcumulados: null, permiteAscenso: false, permiteDescenso: true };

describe('Geometría referencial del recorrido', () => {
  it('construye LineString con origen, paradas ordenadas y destino en [longitud, latitud]', () => {
    const paradas = [{ ...parada, id: 900, lugarId: 33, orden: 10 }, parada, { ...parada, id: 500, lugarId: 11, orden: 0 }];
    const resultado = construirRecorrido(ruta, paradas, lugares);
    expect(resultado.puntos.map(punto => punto.clave)).toEqual(['origen', 'parada:500', 'parada:101', 'parada:900', 'destino']);
    expect(resultado.linea).toEqual({ type: 'Feature', properties: { rutaId: 7 }, geometry: { type: 'LineString', coordinates: [[-78.46, -0.18], [-78.62, -1.24], [-79, -2.9]] } });
    expect(paradas.map(item => item.orden)).toEqual([10, 2, 0]);
    expect(resultado.avisos).toEqual([]);
  });

  it('conserva las relaciones cuando los extremos también son paradas', () => {
    const resultado = construirRecorrido(ruta, [{ ...parada, lugarId: 11, orden: 0 }, { ...parada, id: 102, lugarId: 33, orden: 5 }], lugares);
    expect(resultado.puntos.map(punto => punto.lugarId)).toEqual([11, 11, 33, 33]);
    expect(resultado.linea!.geometry.coordinates).toEqual([[-78.46, -0.18], [-79, -2.9]]);
    expect(resultado.puntos[1].parada!.permiteAscenso).toBe(false);
    expect(resultado.puntos[1].parada!.kmAcumulado).toBe(0);
    expect(resultado.puntos[1].parada!.minutosAcumulados).toBeNull();
  });

  it('resuelve coordenadas de los lugares, no de propiedades inventadas de la ruta o parada', () => {
    const resultado = construirRecorrido(ruta, [parada], lugares);
    expect(resultado.puntos[1].coordenadas).toEqual([-78.62, -1.24]);
    expect(resultado.puntos[1].parada).toBe(parada);
    expect(Object.keys(resultado.linea!.properties!)).toEqual(['rutaId']);
  });

  it('representa los extremos de una ruta que no tiene paradas', () => {
    const resultado = construirRecorrido(ruta, [], lugares);
    expect(resultado.puntos.map(punto => punto.funcion)).toEqual(['ORIGEN', 'DESTINO']);
    expect(resultado.linea!.geometry.coordinates).toHaveLength(2);
  });

  it('omite coordenadas inválidas, informa la omisión y conserva la secuencia conocida', () => {
    const resultado = construirRecorrido(ruta, [parada], lugares.map(lugar => lugar.id === 22 ? { ...lugar, ubicacion: { longitud: Infinity, latitud: 0 } } : lugar));
    expect(resultado.linea!.geometry.coordinates).toEqual([[-78.46, -0.18], [-79, -2.9]]);
    expect(resultado.puntos[1].coordenadas).toBeNull();
    expect(resultado.avisos.join(' ')).toContain('no tienen coordenadas válidas');
  });

  it('maneja lugares ausentes y ubicaciones nulas sin inventar puntos', () => {
    const resultado = construirRecorrido(ruta, [parada], [{ ...lugares[0], ubicacion: null }]);
    expect(resultado.puntos[0].lugar).not.toBeNull();
    expect(resultado.puntos[1].lugar).toBeNull();
    expect(resultado.puntos.every(punto => punto.coordenadas === null)).toBe(true);
    expect(resultado.linea).toBeNull();
  });

  it('no dibuja línea con menos de dos coordenadas distintas y acepta cero real', () => {
    const resultado = construirRecorrido(ruta, [], [{ ...lugares[0], ubicacion: { longitud: 0, latitud: 0 } }]);
    expect(resultado.puntos[0].coordenadas).toEqual([0, 0]);
    expect(resultado.linea).toBeNull();
    expect(construirRecorrido(ruta, [], lugares.map(lugar => ({ ...lugar, ubicacion: { longitud: 0, latitud: 0 } }))).linea).toBeNull();
  });

  it('no decide arbitrariamente una secuencia si hay órdenes repetidos', () => {
    const resultado = construirRecorrido(ruta, [parada, { ...parada, id: 102, lugarId: 33 }], lugares);
    expect(resultado.linea).toBeNull();
    expect(resultado.avisos.join(' ')).toContain('mismo orden');
    expect(resultado.puntos).toHaveLength(4);
  });

  it('conserva relaciones repetidas e informa la inconsistencia sin dibujar línea', () => {
    const resultado = construirRecorrido(ruta, [parada, { ...parada, id: 102, orden: 3 }], lugares);
    expect(resultado.linea).toBeNull();
    expect(resultado.avisos.join(' ')).toContain('lugares repetidos');
    expect(resultado.puntos.filter(punto => punto.lugarId === 22)).toHaveLength(2);
  });

  it.each([
    [{ ...parada, lugarId: 33, orden: 0 }, parada],
    [parada, { ...parada, id: 102, lugarId: 11, orden: 5 }]
  ])('no agrega conexiones arbitrarias si los extremos contradicen el orden', (...paradas) => {
    const resultado = construirRecorrido(ruta, paradas, lugares);
    expect(resultado.linea).toBeNull();
    expect(resultado.avisos.join(' ')).toContain('fuera de los extremos');
  });

  it('advierte si origen y destino comparten ID y preserva ambas funciones', () => {
    const resultado = construirRecorrido({ ...ruta, destinoLugarId: 11 }, [], lugares);
    expect(resultado.puntos.map(punto => punto.funcion)).toEqual(['ORIGEN', 'DESTINO']);
    expect(resultado.linea).toBeNull();
    expect(resultado.avisos.join(' ')).toContain('mismo lugar');
  });
});

describe('Contratos de consulta de rutas y paradas', () => {
  it('conserva rutas inactivas, orden cero, acumulados negativos, null y false', () => {
    expect(leerRutas([{ ...ruta, activa: false }])).toEqual([{ ...ruta, activa: false }]);
    const registro = { ...parada, orden: 0, kmAcumulado: -1.25, minutosAcumulados: -1 };
    expect(leerParadas([registro], 7)).toEqual([registro]);
    expect(leerParadas([parada], 7)![0].permiteAscenso).toBe(false);
    expect(leerParadas([], 7)).toEqual([]);
  });

  it.each([null, {}, [{ ...ruta, id: 0 }], [{ ...ruta, activa: 'true' }], [{ ...ruta, origenLugarId: null }], [{ ...ruta, tipoViaje: 'OTRO' }], [ruta, ruta]])('rechaza rutas mal formadas: %o', respuesta => {
    expect(leerRutas(respuesta)).toBeNull();
  });

  it.each([
    null, {}, [{ ...parada, rutaId: 8 }], [{ ...parada, lugarId: 0 }], [parada, parada],
    [{ ...parada, orden: null }], [{ ...parada, orden: -1 }], [{ ...parada, orden: 1.5 }],
    [{ ...parada, kmAcumulado: NaN }], [{ ...parada, kmAcumulado: 1.001 }],
    [{ ...parada, minutosAcumulados: 1.5 }], [{ ...parada, permiteDescenso: null }]
  ])('rechaza paradas inválidas o de otra ruta: %o', respuesta => {
    expect(leerParadas(respuesta, 7)).toBeNull();
  });
});
