import { LngLatBounds, Marker, Popup } from 'maplibre-gl';
import type { GeoJSONSource, Map as MapaLibre } from 'maplibre-gl';

import { PuntoRecorrido, RecorridoGeografico } from './recorrido-geografico';

let secuenciaRecursos = 0;

interface GrupoMarcador {
  puntos: PuntoRecorrido[];
  elemento: HTMLButtonElement;
  marcador: Marker;
  pulsar: () => void;
}

export class RecursosRecorrido {
  readonly fuenteId = `ecuarutas-recorrido-${++secuenciaRecursos}-fuente`;
  readonly capaId = `${this.fuenteId}-linea`;
  private fuentePropia: GeoJSONSource | undefined;
  private capaPropia: ReturnType<MapaLibre['getLayer']>;
  private recorrido: RecorridoGeografico | null = null;
  private readonly grupos = new Map<number, GrupoMarcador>();
  private popup: Popup | null = null;
  private readonly listenersPopup: Array<{ boton: HTMLButtonElement; pulsar: () => void }> = [];
  private destruido = false;
  private readonly alCambiarEstilo = (): void => {
    if (this.destruido) return;
    try { this.restaurarLinea(true); } catch { this.alError(); }
  };
  private readonly alQuitarMapa = (): void => this.destruir();

  constructor(
    private readonly mapa: MapaLibre,
    private readonly documento: Document,
    private readonly alSeleccionar: (clave: string) => void,
    private readonly alError: () => void
  ) {
    mapa.on('style.load', this.alCambiarEstilo);
    mapa.on('remove', this.alQuitarMapa);
  }

  actualizar(recorrido: RecorridoGeografico | null): void {
    if (this.destruido) return;
    this.limpiarMarcadores();
    this.recorrido = recorrido;
    try {
      for (const punto of recorrido?.puntos ?? []) {
        if (!punto.coordenadas) continue;
        const existente = this.grupos.get(punto.lugarId);
        if (existente) { existente.puntos.push(punto); continue; }
        const elemento = this.documento.createElement('button');
        elemento.type = 'button';
        elemento.className = 'btn rounded-circle shadow border border-2 border-white d-flex align-items-center justify-content-center';
        Object.assign(elemento.style, { width: '38px', height: '38px', padding: '0', fontWeight: '700' });
        const pulsar = (): void => this.alSeleccionar(this.grupos.get(punto.lugarId)!.puntos[0].clave);
        const marcador = new Marker({ element: elemento, anchor: 'center' });
        this.grupos.set(punto.lugarId, { puntos: [punto], elemento, marcador, pulsar });
        elemento.addEventListener('click', pulsar);
        marcador.setLngLat(punto.coordenadas).addTo(this.mapa);
      }
      this.resaltar(null);
      this.restaurarLinea();
    } catch (causa: unknown) {
      this.limpiarMarcadores();
      this.recorrido = null;
      this.limpiarLinea();
      throw causa;
    }
  }

  seleccionar(clave: string | null): void {
    if (this.destruido) return;
    this.cerrarPopup();
    this.resaltar(clave);
    const punto = this.recorrido?.puntos.find(item => item.clave === clave);
    if (!punto?.coordenadas) return;
    const contenido = this.documento.createElement('div');
    contenido.className = 'text-break';
    const titulo = this.documento.createElement('strong');
    titulo.textContent = punto.lugar?.nombre ?? `Lugar #${punto.lugarId}`;
    const descripcion = this.documento.createElement('p');
    descripcion.className = 'my-2';
    descripcion.textContent = `${punto.etiqueta} · Longitud: ${punto.coordenadas[0]} · Latitud: ${punto.coordenadas[1]}`;
    contenido.append(titulo, descripcion);
    if (punto.parada) {
      const datos = this.documento.createElement('p');
      datos.textContent = `Km acumulados: ${punto.parada.kmAcumulado ?? 'Sin dato'} · Minutos acumulados: ${punto.parada.minutosAcumulados ?? 'Sin dato'} · Ascenso: ${punto.parada.permiteAscenso ? 'Sí' : 'No'} · Descenso: ${punto.parada.permiteDescenso ? 'Sí' : 'No'}`;
      contenido.append(datos);
    }
    const grupo = this.grupos.get(punto.lugarId)!;
    if (grupo.puntos.length > 1) {
      const aviso = this.documento.createElement('p');
      aviso.className = 'small mb-1';
      aviso.textContent = 'Funciones de este lugar en la ruta:';
      contenido.append(aviso);
      for (const funcion of grupo.puntos) {
        const boton = this.documento.createElement('button');
        boton.type = 'button';
        boton.className = 'btn btn-sm btn-outline-primary m-1';
        boton.textContent = funcion.etiqueta;
        boton.setAttribute('aria-pressed', String(funcion.clave === clave));
        const pulsar = (): void => this.alSeleccionar(funcion.clave);
        boton.addEventListener('click', pulsar);
        this.listenersPopup.push({ boton, pulsar });
        contenido.append(boton);
      }
    }
    try {
      this.popup = new Popup({ closeButton: true, closeOnClick: false, focusAfterOpen: false, maxWidth: '300px' });
      this.popup.setLngLat(punto.coordenadas).setDOMContent(contenido).addTo(this.mapa);
    } catch (causa: unknown) { this.cerrarPopup(); throw causa; }
  }

  centrar(clave: string): boolean {
    if (this.destruido) return false;
    const punto = this.recorrido?.puntos.find(item => item.clave === clave);
    if (!punto?.coordenadas) return false;
    this.mapa.easeTo({ center: punto.coordenadas, zoom: Math.max(this.mapa.getZoom(), 12), duration: 450 });
    return true;
  }

  ajustarVista(): boolean {
    if (this.destruido || !this.grupos.size) return false;
    const puntos = [...this.grupos.values()].map(grupo => grupo.puntos[0]);
    if (puntos.length === 1) return this.centrar(puntos[0].clave);
    const limites = new LngLatBounds();
    for (const punto of puntos) limites.extend(punto.coordenadas!);
    const contenedor = this.mapa.getContainer();
    const menor = Math.min(contenedor.clientWidth, contenedor.clientHeight);
    this.mapa.fitBounds(limites, { padding: menor > 0 ? Math.min(48, menor / 5) : 24, maxZoom: 12, duration: 450 });
    return true;
  }

  destruir(): void {
    if (this.destruido) return;
    this.destruido = true;
    this.mapa.off('style.load', this.alCambiarEstilo);
    this.mapa.off('remove', this.alQuitarMapa);
    this.limpiarMarcadores();
    this.limpiarLinea();
    this.recorrido = null;
  }

  private restaurarLinea(estiloRecienCargado = false): void {
    if (!this.recorrido?.linea) { this.limpiarLinea(); return; }
    const fuente = this.mapa.getSource<GeoJSONSource>(this.fuenteId);
    // style.load confirma que el estilo admite recursos; isStyleLoaded puede seguir
    // siendo false mientras se descargan datos de sus fuentes. Una source propia ya
    // existente también puede actualizarse sin esperar otro evento style.load.
    if (!estiloRecienCargado && !this.mapa.isStyleLoaded() && !fuente) return;
    if (fuente && fuente !== this.fuentePropia) throw new Error('El identificador de la fuente está ocupado.');
    if (fuente) fuente.setData(this.recorrido.linea);
    else {
      this.mapa.addSource(this.fuenteId, { type: 'geojson', data: this.recorrido.linea });
      this.fuentePropia = this.mapa.getSource<GeoJSONSource>(this.fuenteId);
    }
    const capa = this.mapa.getLayer(this.capaId);
    if (capa && capa !== this.capaPropia) throw new Error('El identificador de la capa está ocupado.');
    if (!capa) {
      this.mapa.addLayer({
        id: this.capaId, type: 'line', source: this.fuenteId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#1769aa', 'line-width': 4, 'line-dasharray': [2, 2], 'line-opacity': 0.85 }
      });
      this.capaPropia = this.mapa.getLayer(this.capaId);
    }
  }

  private limpiarLinea(): void {
    if (this.capaPropia && this.mapa.getLayer(this.capaId) === this.capaPropia) this.mapa.removeLayer(this.capaId);
    if (this.fuentePropia && this.mapa.getSource(this.fuenteId) === this.fuentePropia) this.mapa.removeSource(this.fuenteId);
    this.capaPropia = undefined;
    this.fuentePropia = undefined;
  }

  private resaltar(clave: string | null): void {
    for (const grupo of this.grupos.values()) {
      const origen = grupo.puntos.some(punto => punto.funcion === 'ORIGEN');
      const destino = grupo.puntos.some(punto => punto.funcion === 'DESTINO');
      const seleccionado = grupo.puntos.some(punto => punto.clave === clave);
      grupo.elemento.textContent = origen && destino ? 'O/D' : origen ? 'O' : destino ? 'D' : String(grupo.puntos[0].parada!.orden);
      grupo.elemento.setAttribute('aria-label', `${grupo.puntos.map(punto => punto.etiqueta).join(', ')}: ${grupo.puntos[0].lugar?.nombre ?? `Lugar #${grupo.puntos[0].lugarId}`}`);
      grupo.elemento.setAttribute('aria-pressed', String(seleccionado));
      grupo.elemento.classList.toggle('btn-warning', seleccionado);
      grupo.elemento.classList.toggle('btn-success', !seleccionado && origen);
      grupo.elemento.classList.toggle('btn-danger', !seleccionado && !origen && destino);
      grupo.elemento.classList.toggle('btn-primary', !seleccionado && !origen && !destino);
    }
  }

  private cerrarPopup(): void {
    for (const { boton, pulsar } of this.listenersPopup) boton.removeEventListener('click', pulsar);
    this.listenersPopup.length = 0;
    this.popup?.remove();
    this.popup = null;
  }

  private limpiarMarcadores(): void {
    this.cerrarPopup();
    for (const grupo of this.grupos.values()) {
      grupo.elemento.removeEventListener('click', grupo.pulsar);
      grupo.marcador.remove();
    }
    this.grupos.clear();
  }
}
