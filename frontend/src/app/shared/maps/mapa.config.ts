import { InjectionToken } from '@angular/core';
import type { MapOptions, StyleSpecification } from 'maplibre-gl';

// Vista inicial del Ecuador continental; no representa la ubicación de un registro.
export const CENTRO_ECUADOR: [number, number] = [-78.5, -1.5];
export const ZOOM_ECUADOR = 5;
// Desarrollo: uso interactivo, sin precarga ni descargas masivas.
// Antes de producción, revisar https://operations.osmfoundation.org/policies/tiles/
// y sustituir MAPA_ESTILO_BASE por un proveedor adecuado al tráfico esperado.
export const ESTILO_MAPA_OSM = {
  version: 8,
  projection: { type: 'mercator' },
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
    }
  },
  layers: [{ id: 'osm-base', type: 'raster', source: 'osm-raster' }]
} satisfies StyleSpecification;

// El proveedor puede reemplazarse por DI o por el input estilo, sin tocar consumidores.
export const MAPA_ESTILO_BASE = new InjectionToken<NonNullable<MapOptions['style']>>('MAPA_ESTILO_BASE', {
  providedIn: 'root',
  factory: () => ESTILO_MAPA_OSM
});

// MapLibre 6 requiere una URL explícita para el worker cuando se utiliza un bundler.
// Se puede sustituir por una URL propia antes de inicializar el primer mapa.
export const MAPA_WORKER_URL = new InjectionToken<string>('MAPA_WORKER_URL', {
  providedIn: 'root',
  factory: () => 'https://cdn.jsdelivr.net/npm/maplibre-gl@6.14.0/dist/maplibre-gl-worker.mjs'
});
