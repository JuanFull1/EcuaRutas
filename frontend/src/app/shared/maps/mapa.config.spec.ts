import { TestBed } from '@angular/core/testing';
import { CENTRO_ECUADOR, ESTILO_MAPA_OSM, MAPA_ESTILO_BASE, ZOOM_ECUADOR } from './mapa.config';

describe('Mapa base OpenStreetMap', () => {
  it('utiliza teselas raster estandar XYZ de 256 px sin claves ni estilo politico remoto', () => {
    expect(ESTILO_MAPA_OSM.version).toBe(8);
    expect(ESTILO_MAPA_OSM.sources['osm-raster']).toEqual(expect.objectContaining({
      type: 'raster', tileSize: 256, minzoom: 0, maxzoom: 19,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png']
    }));
    expect(JSON.stringify(ESTILO_MAPA_OSM)).not.toContain('demotiles');
  });

  it('dibuja la fuente mediante una capa raster y conserva Mercator', () => {
    expect(ESTILO_MAPA_OSM.layers).toEqual([{ id: 'osm-base', type: 'raster', source: 'osm-raster' }]);
    expect(ESTILO_MAPA_OSM.projection).toEqual({ type: 'mercator' });
  });

  it('declara la atribucion y el enlace de licencia de OpenStreetMap', () => {
    const atribucion = ESTILO_MAPA_OSM.sources['osm-raster'].attribution;
    expect(atribucion).toContain('©');
    expect(atribucion).toContain('OpenStreetMap');
    expect(atribucion).toContain('contributors');
    expect(atribucion).toContain('https://www.openstreetmap.org/copyright');
  });

  it('ofrece un valor por defecto sustituible mediante DI sin limitar la navegacion a Ecuador', () => {
    expect(TestBed.inject(MAPA_ESTILO_BASE)).toBe(ESTILO_MAPA_OSM);
    expect(CENTRO_ECUADOR).toEqual([-78.5, -1.5]);
    expect(ZOOM_ECUADOR).toBe(5);
    expect(ESTILO_MAPA_OSM.sources['osm-raster']).not.toHaveProperty('bounds');
  });
});
