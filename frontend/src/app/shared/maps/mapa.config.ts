import { InjectionToken } from '@angular/core';

// Vista inicial del Ecuador continental; no representa la ubicación de un registro.
export const CENTRO_ECUADOR: [number, number] = [-78.5, -1.5];
export const ZOOM_ECUADOR = 5;
export const ESTILO_MAPA_DESARROLLO = 'https://demotiles.maplibre.org/style.json';

// MapLibre 6 requiere una URL explícita para el worker cuando se utiliza un bundler.
// Se puede sustituir por una URL propia antes de inicializar el primer mapa.
export const MAPA_WORKER_URL = new InjectionToken<string>('MAPA_WORKER_URL', {
  providedIn: 'root',
  factory: () => 'https://cdn.jsdelivr.net/npm/maplibre-gl@6.14.0/dist/maplibre-gl-worker.mjs'
});
