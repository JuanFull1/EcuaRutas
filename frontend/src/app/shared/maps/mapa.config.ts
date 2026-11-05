
import { InjectionToken } from '@angular/core';
import type { StyleSpecification } from 'maplibre-gl';

// Centro geográfico inicial del Ecuador continental.
// Formato: [longitud, latitud].
export const CENTRO_ECUADOR: [number, number] = [-78.5, -1.5];

export const ZOOM_ECUADOR = 6.5;

// Cartografía real de OpenStreetMap:
// calles, avenidas, carreteras, ciudades y otros lugares.
export const ESTILO_MAPA_CALLES: StyleSpecification = {
  version: 8,

  name: 'EcuaRutas - OpenStreetMap',

  sources: {
    'openstreetmap': {
      type: 'raster',
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution:
        '© OpenStreetMap contributors'
    }
  },

  layers: [
    {
      id: 'calles-openstreetmap',
      type: 'raster',
      source: 'openstreetmap',
      minzoom: 0,
      maxzoom: 22,
      paint: {
        'raster-opacity': 1
      }
    }
  ]
};

// Conservamos el nombre anterior porque otros
// componentes y pruebas ya lo utilizan.
export const ESTILO_MAPA_DESARROLLO = ESTILO_MAPA_CALLES;

// Configuración del worker de MapLibre.
export const MAPA_WORKER_URL =
  new InjectionToken<string>('MAPA_WORKER_URL', {
    providedIn: 'root',
    factory: () =>
      'https://cdn.jsdelivr.net/npm/maplibre-gl@6.14.0/dist/maplibre-gl-worker.mjs'
  });
