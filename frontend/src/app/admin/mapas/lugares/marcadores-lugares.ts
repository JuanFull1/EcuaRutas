import { LngLatBounds, Marker, Popup } from 'maplibre-gl';
import type { Map as MapaLibre } from 'maplibre-gl';

import { LugarDto } from '../../lugares/lugar.model';
import { coordenadasMapa, CoordenadasMapa } from './lugar-geografico';

interface RegistroMarcador {
  lugar: LugarDto;
  coordenadas: CoordenadasMapa;
  marcador: Marker;
  elemento: HTMLButtonElement;
  seleccionar: () => void;
}

// Posee únicamente los recursos del visualizador. El mapa pertenece siempre a app-mapa.
export class MarcadoresLugares {
  private readonly registros = new Map<number, RegistroMarcador>();
  private popup: Popup | null = null;
  private destruido = false;
  private readonly alEliminarMapa = (): void => this.destruir();

  constructor(
    private readonly mapa: MapaLibre,
    private readonly documento: Document,
    private readonly alSeleccionar: (id: number) => void
  ) {
    this.mapa.on('remove', this.alEliminarMapa);
  }

  actualizar(lugares: readonly LugarDto[]): void {
    if (this.destruido) return;
    this.limpiar();
    try {
      for (const lugar of lugares) {
        const coordenadas = coordenadasMapa(lugar.ubicacion);
        if (!coordenadas || this.registros.has(lugar.id)) continue;
        const elemento = this.documento.createElement('button');
        elemento.type = 'button';
        elemento.className = 'btn rounded-circle d-flex align-items-center justify-content-center shadow border border-2 border-white';
        elemento.style.width = '34px';
        elemento.style.height = '34px';
        elemento.style.padding = '0';
        elemento.setAttribute('aria-label', `Seleccionar ${lugar.nombre}`);
        const icono = this.documento.createElement('i');
        icono.className = 'bi bi-geo-alt-fill';
        icono.setAttribute('aria-hidden', 'true');
        elemento.append(icono);
        const seleccionar = (): void => this.alSeleccionar(lugar.id);
        const marcador = new Marker({ element: elemento, anchor: 'center' });
        this.registros.set(lugar.id, { lugar, coordenadas, marcador, elemento, seleccionar });
        elemento.addEventListener('click', seleccionar);
        marcador.setLngLat(coordenadas).addTo(this.mapa);
      }
      this.resaltar(null);
    } catch (causa: unknown) {
      this.limpiar();
      throw causa;
    }
  }

  seleccionar(id: number | null): void {
    if (this.destruido) return;
    this.popup?.remove();
    this.popup = null;
    this.resaltar(id);
    const registro = id === null ? undefined : this.registros.get(id);
    if (!registro) return;
    const contenido = this.documento.createElement('div');
    const nombre = this.documento.createElement('strong');
    nombre.textContent = registro.lugar.nombre;
    const estado = this.documento.createElement('p');
    estado.className = 'mb-1 mt-2';
    estado.textContent = registro.lugar.activo ? 'Activo' : 'Inactivo';
    const ubicacion = this.documento.createElement('p');
    ubicacion.className = 'mb-0';
    ubicacion.textContent = `Longitud: ${registro.coordenadas[0]} · Latitud: ${registro.coordenadas[1]}`;
    contenido.append(nombre, estado, ubicacion);
    try {
      this.popup = new Popup({ closeButton: true, closeOnClick: false, focusAfterOpen: false, maxWidth: '280px' });
      this.popup.setLngLat(registro.coordenadas).setDOMContent(contenido).addTo(this.mapa);
    } catch (causa: unknown) {
      this.popup?.remove();
      this.popup = null;
      throw causa;
    }
  }

  centrar(id: number): boolean {
    if (this.destruido) return false;
    const registro = this.registros.get(id);
    if (!registro) return false;
    this.mapa.easeTo({ center: registro.coordenadas, zoom: Math.max(this.mapa.getZoom(), 12), duration: 450 });
    return true;
  }

  ajustarVista(): boolean {
    if (this.destruido || this.registros.size === 0) return false;
    const registros = [...this.registros.values()];
    if (registros.length === 1) return this.centrar(registros[0].lugar.id);
    const limites = new LngLatBounds();
    for (const registro of registros) limites.extend(registro.coordenadas);
    const contenedor = this.mapa.getContainer();
    const dimension = Math.min(contenedor.clientWidth, contenedor.clientHeight);
    const padding = dimension > 0 ? Math.min(48, dimension / 5) : 24;
    this.mapa.fitBounds(limites, { padding, maxZoom: 12, duration: 450 });
    return true;
  }

  destruir(): void {
    if (this.destruido) return;
    this.destruido = true;
    this.mapa.off('remove', this.alEliminarMapa);
    this.limpiar();
  }

  private resaltar(id: number | null): void {
    for (const [identificador, registro] of this.registros) {
      const seleccionado = identificador === id;
      registro.elemento.setAttribute('aria-pressed', String(seleccionado));
      registro.elemento.classList.toggle('btn-warning', seleccionado);
      registro.elemento.classList.toggle('btn-primary', !seleccionado && registro.lugar.activo);
      registro.elemento.classList.toggle('btn-secondary', !seleccionado && !registro.lugar.activo);
    }
  }

  private limpiar(): void {
    this.popup?.remove();
    this.popup = null;
    for (const registro of this.registros.values()) {
      registro.elemento.removeEventListener('click', registro.seleccionar);
      registro.marcador.remove();
    }
    this.registros.clear();
  }
}
