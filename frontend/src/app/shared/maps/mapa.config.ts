import { InjectionToken } from '@angular/core';
import type { StyleSpecification } from 'maplibre-gl';

// Vista inicial del Ecuador continental; no representa la ubicación de un registro.
export const CENTRO_ECUADOR: [number, number] = [-78.5, -1.5];
export const ZOOM_ECUADOR = 5;
// Teselas de la vista actual con la caché HTTP normal del navegador.
// https://operations.osmfoundation.org/policies/tiles/
export const ESTILO_MAPA_OSM: StyleSpecification = {
  version: 8,
  sources: {
    openstreetmap: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }
  },
  layers: [{ id: 'openstreetmap-base', type: 'raster', source: 'openstreetmap' }]
};

// MapLibre 6 requiere una URL explícita para el worker cuando se utiliza un bundler.
// Se puede sustituir por una URL propia antes de inicializar el primer mapa.
export const MAPA_WORKER_URL = new InjectionToken<string>('MAPA_WORKER_URL', {
  providedIn: 'root',
  factory: () => 'https://cdn.jsdelivr.net/npm/maplibre-gl@6.14.0/dist/maplibre-gl-worker.mjs'
});
