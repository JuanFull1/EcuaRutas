import { LugarDto } from '../../lugares/lugar.model';
import { coordenadasMapa, leerLugares } from './lugar-geografico';

describe('Coordenadas de lugares', () => {
  it('devuelve el orden [longitud, latitud] y conserva la precisión', () => {
    expect(coordenadasMapa({ latitud: -0.180653, longitud: -78.467838 })).toEqual([-78.467838, -0.180653]);
  });

  it.each([
    { latitud: 0, longitud: 0 }, { latitud: 90, longitud: 180 }, { latitud: -90, longitud: -180 }
  ])('acepta cero y los límites geográficos: %o', ubicacion => {
    expect(coordenadasMapa(ubicacion)).toEqual([ubicacion.longitud, ubicacion.latitud]);
  });

  it.each([
    null, undefined, {}, { latitud: 0 }, { longitud: 0 },
    { latitud: null, longitud: -78 }, { latitud: -1, longitud: null },
    { latitud: '-1', longitud: -78 }, { latitud: -1, longitud: '-78' },
    { latitud: 90.001, longitud: 0 }, { latitud: -90.001, longitud: 0 },
    { latitud: 0, longitud: 180.001 }, { latitud: 0, longitud: -180.001 },
    { latitud: NaN, longitud: -78 }, { latitud: -1, longitud: NaN },
    { latitud: Infinity, longitud: 0 }, { latitud: -Infinity, longitud: 0 },
    { latitud: 0, longitud: Infinity }, { latitud: 0, longitud: -Infinity },
    [-78, -1], 'sin ubicación', 0
  ])('omite ubicaciones nulas o inválidas sin inventar un punto: %o', ubicacion => {
    expect(coordenadasMapa(ubicacion)).toBeNull();
  });
});

describe('Respuesta de consulta de lugares', () => {
  const lugar: LugarDto = { id: 7, nombre: 'Quito', provincia: null, canton: null, tipo: 'CIUDAD', ubicacion: null, activo: false };

  it('acepta un listado vacío y conserva null y false', () => {
    expect(leerLugares([])).toEqual([]);
    expect(leerLugares([lugar])).toEqual([lugar]);
  });

  it('deduplica por ID sin duplicar registros ni marcadores', () => {
    expect(leerLugares([lugar, { ...lugar, nombre: 'Nombre actualizado' }])).toEqual([{ ...lugar, nombre: 'Nombre actualizado' }]);
  });

  it('conserva registros con coordenadas inválidas para informar de su ausencia en la lista', () => {
    const invalido = { ...lugar, ubicacion: { latitud: 200, longitud: -78 } };
    expect(leerLugares([invalido])).toEqual([invalido]);
    expect(coordenadasMapa(leerLugares([invalido])![0].ubicacion)).toBeNull();
  });

  it.each([
    null, {}, { items: [] }, [null], [5], [{ ...lugar, id: 0 }], [{ ...lugar, id: 1.5 }],
    [{ ...lugar, nombre: null }], [{ ...lugar, activo: 'false' }], [{ ...lugar, tipo: 'OTRO' }],
    [{ ...lugar, tipo: { toString: 'inválido' } }], [{ ...lugar, provincia: 5 }], [{ ...lugar, canton: false }]
  ])('rechaza respuestas inesperadas: %o', respuesta => {
    expect(leerLugares(respuesta)).toBeNull();
  });
});
