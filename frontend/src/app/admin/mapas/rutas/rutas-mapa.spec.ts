import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { Map as MapaLibre, MapOptions } from 'maplibre-gl';

import { API_URL } from '../../../services/api.config';
import { Mapa } from '../../../shared/maps/mapa';
import { LugarDto } from '../../lugares/lugar.model';
import { RutaParadaDto } from '../../paradas/ruta-parada.model';
import { RutaDto } from '../../rutas/ruta.model';
import { construirRecorrido } from './recorrido-geografico';
import { RecursosRecorrido } from './recursos-recorrido';
import { RutasMapa } from './rutas-mapa';

const dobles = vi.hoisted(() => {
  class MapaSimulado {
    readonly eventos = new Map<string, Set<(evento?: unknown) => void>>();
    readonly fuentes = new Map<string, { datos: unknown; setData: ReturnType<typeof vi.fn> }>();
    readonly capas = new Map<string, object>();
    readonly on = vi.fn((tipo: string, listener: (evento?: unknown) => void) => {
      if (!this.eventos.has(tipo)) this.eventos.set(tipo, new Set());
      this.eventos.get(tipo)!.add(listener); return this;
    });
    readonly off = vi.fn((tipo: string, listener: (evento?: unknown) => void) => { this.eventos.get(tipo)?.delete(listener); return this; });
    emitir(tipo: string): void { for (const listener of [...this.eventos.get(tipo) ?? []]) listener(); }
    readonly addControl = vi.fn();
    readonly getZoom = vi.fn(() => 5);
    readonly getContainer = vi.fn(() => this.opciones.container as HTMLElement);
    readonly fitBounds = vi.fn();
    readonly easeTo = vi.fn();
    readonly jumpTo = vi.fn();
    readonly resize = vi.fn();
    readonly setStyle = vi.fn();
    readonly isStyleLoaded = vi.fn(() => true);
    readonly addSource = vi.fn((id: string, opciones: { data: unknown }) => {
      const fuente = { datos: opciones.data, setData: vi.fn((datos: unknown) => { fuente.datos = datos; }) };
      this.fuentes.set(id, fuente); return this;
    });
    readonly getSource = vi.fn((id: string) => this.fuentes.get(id));
    readonly removeSource = vi.fn((id: string) => { this.fuentes.delete(id); return this; });
    readonly addLayer = vi.fn((capa: { id: string }) => { this.capas.set(capa.id, capa); return this; });
    readonly getLayer = vi.fn((id: string) => this.capas.get(id));
    readonly removeLayer = vi.fn((id: string) => { this.capas.delete(id); return this; });
    readonly remove = vi.fn(() => { this.emitir('remove'); this.eventos.clear(); this.fuentes.clear(); this.capas.clear(); });
    constructor(readonly opciones: MapOptions) {}
  }
  class MarcadorSimulado {
    readonly setLngLat = vi.fn((_dato: unknown) => this);
    readonly addTo = vi.fn((mapa: MapaSimulado) => { mapa.getContainer().append(this.opciones.element); return this; });
    readonly remove = vi.fn(() => { this.opciones.element.remove(); return this; });
    constructor(readonly opciones: { element: HTMLButtonElement }) {}
  }
  class PopupSimulado {
    readonly elemento = document.createElement('div');
    readonly setLngLat = vi.fn((_dato: unknown) => this);
    readonly setDOMContent = vi.fn((contenido: Node) => { this.elemento.replaceChildren(contenido); return this; });
    readonly addTo = vi.fn((mapa: MapaSimulado) => { mapa.getContainer().append(this.elemento); return this; });
    readonly remove = vi.fn(() => { this.elemento.remove(); return this; });
  }
  class LimitesSimulados {
    readonly puntos: unknown[] = [];
    extend(punto: unknown): this { this.puntos.push(punto); return this; }
  }
  return {
    crearMapa: vi.fn(function (opciones: MapOptions) { return new MapaSimulado(opciones); }),
    crearMarcador: vi.fn(function (opciones: { element: HTMLButtonElement }) { return new MarcadorSimulado(opciones); }),
    crearPopup: vi.fn(function (_opciones: unknown) { return new PopupSimulado(); }),
    crearLimites: vi.fn(function () { return new LimitesSimulados(); }),
    crearControl: vi.fn(function () { return {}; }),
    getWorkerUrl: vi.fn(() => '/worker-prueba.mjs'), setWorkerUrl: vi.fn()
  };
});

vi.mock('maplibre-gl', () => ({
  Map: dobles.crearMapa, Marker: dobles.crearMarcador, Popup: dobles.crearPopup, LngLatBounds: dobles.crearLimites,
  NavigationControl: dobles.crearControl, getWorkerUrl: dobles.getWorkerUrl, setWorkerUrl: dobles.setWorkerUrl
}));

const ruta: RutaDto = { id: 7, nombre: 'Quito – Cuenca', origenLugarId: 11, destinoLugarId: 33, tipoViaje: 'CON_PARADAS', activa: true };
const otraRuta: RutaDto = { ...ruta, id: 8, nombre: 'Regreso', origenLugarId: 33, destinoLugarId: 11, activa: false };
const lugares: LugarDto[] = [
  { id: 11, nombre: 'Quito', provincia: 'Pichincha', canton: null, tipo: 'CIUDAD', ubicacion: { longitud: -78.46, latitud: -0.18 }, activo: true },
  { id: 22, nombre: 'Ambato', provincia: 'Tungurahua', canton: null, tipo: 'PARADA', ubicacion: { longitud: -78.62, latitud: -1.24 }, activo: true },
  { id: 33, nombre: 'Cuenca', provincia: 'Azuay', canton: null, tipo: 'TERMINAL', ubicacion: { longitud: -79, latitud: -2.9 }, activo: false }
];
const parada: RutaParadaDto = { id: 102, rutaId: 7, lugarId: 22, orden: 5, kmAcumulado: 0, minutosAcumulados: null, permiteAscenso: false, permiteDescenso: true };
const paradas: RutaParadaDto[] = [
  { ...parada, id: 103, lugarId: 33, orden: 10, kmAcumulado: 450.25, minutosAcumulados: 420 },
  parada,
  { ...parada, id: 101, lugarId: 11, orden: 0 }
];

describe('Recursos cartográficos del recorrido', () => {
  let mapa: ReturnType<typeof dobles.crearMapa>;
  let recursos: RecursosRecorrido;
  let seleccionar = vi.fn<(clave: string) => void>();
  let error = vi.fn<() => void>();
  const recorrido = () => construirRecorrido(ruta, paradas, lugares);

  beforeEach(() => {
    vi.clearAllMocks();
    mapa = new dobles.crearMapa({ container: document.createElement('div') });
    seleccionar = vi.fn<(clave: string) => void>();
    error = vi.fn<() => void>();
    recursos = new RecursosRecorrido(mapa as unknown as MapaLibre, document, seleccionar, error);
  });
  afterEach(() => recursos.destruir());

  it('representa tres lugares conservando cinco funciones de origen, paradas y destino', () => {
    recursos.actualizar(recorrido());
    expect(dobles.crearMarcador).toHaveBeenCalledTimes(3);
    const botones = dobles.crearMarcador.mock.results.map(resultado => resultado.value.opciones.element);
    expect(botones.map(boton => boton.textContent)).toEqual(['O', '5', 'D']);
    expect(botones[0].getAttribute('aria-label')).toContain('Parada · orden 0');
    expect(botones[2].getAttribute('aria-label')).toContain('Destino');
    expect(dobles.crearMarcador.mock.results[1].value.setLngLat).toHaveBeenCalledWith([-78.62, -1.24]);
  });

  it('crea una source GeoJSON y una layer line con trazado discontinuo', () => {
    recursos.actualizar(recorrido());
    expect(mapa.addSource).toHaveBeenCalledWith(recursos.fuenteId, { type: 'geojson', data: recorrido().linea });
    expect(mapa.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: recursos.capaId, type: 'line', source: recursos.fuenteId, paint: expect.objectContaining({ 'line-dasharray': [2, 2] }) }));
  });

  it('espera al estilo antes de agregar fuentes y restaura solo sus recursos tras recargarlo', () => {
    mapa.isStyleLoaded.mockReturnValue(false);
    recursos.actualizar(recorrido());
    expect(mapa.addSource).not.toHaveBeenCalled();
    mapa.emitir('style.load');
    expect(mapa.addSource).toHaveBeenCalledOnce();
    mapa.fuentes.clear(); mapa.capas.clear();
    mapa.fuentes.set('fuente-ajena', { datos: {}, setData: vi.fn() });
    mapa.capas.set('capa-ajena', {});
    mapa.emitir('style.load');
    expect(mapa.addSource).toHaveBeenCalledTimes(2);
    expect(dobles.crearMarcador).toHaveBeenCalledTimes(3);
    expect(mapa.fuentes.has('fuente-ajena')).toBe(true);
    expect(mapa.capas.has('capa-ajena')).toBe(true);
  });

  it('no duplica listeners ni layers al recibir varios eventos de estilo', () => {
    recursos.actualizar(recorrido());
    mapa.emitir('style.load'); mapa.emitir('style.load');
    expect(mapa.eventos.get('style.load')!.size).toBe(1);
    expect(mapa.addSource).toHaveBeenCalledOnce();
    expect(mapa.addLayer).toHaveBeenCalledOnce();
    expect(mapa.fuentes.get(recursos.fuenteId)!.setData).toHaveBeenCalledTimes(2);
  });

  it('actualiza los datos de la source existente y retira marcadores anteriores', () => {
    recursos.actualizar(recorrido());
    const anteriores = dobles.crearMarcador.mock.results.map(resultado => resultado.value);
    recursos.actualizar(construirRecorrido(otraRuta, [], lugares));
    expect(mapa.addSource).toHaveBeenCalledOnce();
    expect(mapa.fuentes.get(recursos.fuenteId)!.setData).toHaveBeenCalledWith(construirRecorrido(otraRuta, [], lugares).linea);
    for (const marcador of anteriores) { expect(marcador.remove).toHaveBeenCalledOnce(); marcador.opciones.element.click(); }
    expect(seleccionar).not.toHaveBeenCalled();
  });

  it('actualiza una source propia aunque isStyleLoaded espere todavía datos pendientes', () => {
    recursos.actualizar(recorrido());
    mapa.isStyleLoaded.mockReturnValue(false);
    recursos.actualizar(construirRecorrido(otraRuta, [], lugares));
    expect(mapa.fuentes.get(recursos.fuenteId)!.setData).toHaveBeenCalledWith(construirRecorrido(otraRuta, [], lugares).linea);
  });

  it('elimina layer antes de source al limpiar la ruta y no restaura el recorrido antiguo', () => {
    recursos.actualizar(recorrido());
    recursos.actualizar(null);
    expect(mapa.removeLayer).toHaveBeenCalledWith(recursos.capaId);
    expect(mapa.removeSource).toHaveBeenCalledWith(recursos.fuenteId);
    expect(mapa.removeLayer.mock.invocationCallOrder[0]).toBeLessThan(mapa.removeSource.mock.invocationCallOrder[0]);
    mapa.emitir('style.load');
    expect(mapa.addSource).toHaveBeenCalledOnce();
    expect(mapa.getContainer().querySelectorAll('button')).toHaveLength(0);
  });

  it('omite líneas con datos insuficientes, pero permite consultar un marcador válido', () => {
    recursos.actualizar(construirRecorrido(ruta, [], [lugares[0]]));
    expect(mapa.addSource).not.toHaveBeenCalled();
    expect(dobles.crearMarcador).toHaveBeenCalledOnce();
    expect(recursos.ajustarVista()).toBe(true);
    expect(mapa.easeTo).toHaveBeenCalledOnce();
    expect(recursos.centrar('destino')).toBe(false);
  });

  it('distingue funciones compartidas mediante opciones del popup y mantiene la identidad de parada', () => {
    recursos.actualizar(recorrido());
    const origen = dobles.crearMarcador.mock.results[0].value.opciones.element;
    origen.click();
    expect(seleccionar).toHaveBeenCalledWith('origen');
    recursos.seleccionar('origen');
    const popup = dobles.crearPopup.mock.results[0].value;
    const opciones = Array.from((popup.elemento as HTMLDivElement).querySelectorAll<HTMLButtonElement>('button'));
    expect(opciones.map(boton => boton.textContent)).toEqual(['Origen', 'Parada · orden 0']);
    opciones[1].click();
    expect(seleccionar).toHaveBeenLastCalledWith('parada:101');
    recursos.seleccionar('parada:101');
    expect(dobles.crearPopup.mock.results.at(-1)!.value.elemento.textContent).toContain('Ascenso: No');
    expect(dobles.crearMarcador).toHaveBeenCalledTimes(3);
    expect(origen.getAttribute('aria-pressed')).toBe('true');
  });

  it('usa DOM seguro, conserva cero, null y false y limpia listeners de opciones anteriores', () => {
    const malicioso = '<img src=x onerror=alert(1)>';
    recursos.actualizar(construirRecorrido(ruta, paradas, lugares.map(lugar => ({ ...lugar, nombre: malicioso }))));
    recursos.seleccionar('parada:101');
    const popup = dobles.crearPopup.mock.results[0].value;
    expect(popup.elemento.textContent).toContain(malicioso);
    expect(popup.elemento.querySelector('img')).toBeNull();
    expect(popup.elemento.textContent).toContain('Km acumulados: 0');
    expect(popup.elemento.textContent).toContain('Minutos acumulados: Sin dato');
    const boton = popup.elemento.querySelector('button')!;
    recursos.seleccionar('destino');
    boton.click();
    expect(seleccionar).not.toHaveBeenCalled();
    expect(popup.remove).toHaveBeenCalledOnce();
  });

  it('ajusta todos los puntos y centra sin recalcular distancias ni reconstruir marcadores', () => {
    recursos.actualizar(recorrido());
    recursos.ajustarVista();
    expect(dobles.crearLimites.mock.results[0].value.puntos).toEqual([[-78.46, -0.18], [-78.62, -1.24], [-79, -2.9]]);
    expect(mapa.fitBounds).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ maxZoom: 12 }));
    recursos.seleccionar('parada:102');
    recursos.centrar('parada:102');
    expect(mapa.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [-78.62, -1.24] }));
    expect(dobles.crearMarcador).toHaveBeenCalledTimes(3);
  });

  it('mantiene IDs únicos entre visualizadores y no elimina recursos ajenos', () => {
    recursos.actualizar(recorrido());
    const otros = new RecursosRecorrido(mapa as unknown as MapaLibre, document, seleccionar, error);
    otros.actualizar(recorrido());
    expect(otros.fuenteId).not.toBe(recursos.fuenteId);
    recursos.destruir();
    expect(mapa.getSource(otros.fuenteId)).toBeDefined();
    expect(mapa.getLayer(otros.capaId)).toBeDefined();
    otros.destruir();
  });

  it('no elimina una source o layer que haya sido reemplazada por otro propietario', () => {
    recursos.actualizar(recorrido());
    const fuenteAjena = { datos: {}, setData: vi.fn() };
    const capaAjena = {};
    mapa.fuentes.set(recursos.fuenteId, fuenteAjena); mapa.capas.set(recursos.capaId, capaAjena);
    recursos.destruir();
    expect(mapa.getSource(recursos.fuenteId)).toBe(fuenteAjena);
    expect(mapa.getLayer(recursos.capaId)).toBe(capaAjena);
  });

  it('libera markers, popups, listeners, layer y source una sola vez sin destruir el mapa', () => {
    recursos.actualizar(recorrido()); recursos.seleccionar('origen');
    const marker = dobles.crearMarcador.mock.results[0].value;
    const popup = dobles.crearPopup.mock.results[0].value;
    recursos.destruir(); recursos.destruir();
    marker.opciones.element.click();
    expect(marker.remove).toHaveBeenCalledOnce(); expect(popup.remove).toHaveBeenCalledOnce();
    expect(mapa.removeLayer).toHaveBeenCalledOnce(); expect(mapa.removeSource).toHaveBeenCalledOnce();
    expect(mapa.eventos.get('style.load')!.size).toBe(0);
    expect(seleccionar).not.toHaveBeenCalled(); expect(mapa.remove).not.toHaveBeenCalled();
  });

  it('se limpia al destruir el mapa propietario y no acepta actualizaciones tardías', () => {
    recursos.actualizar(recorrido());
    mapa.remove();
    recursos.actualizar(recorrido());
    expect(dobles.crearMarcador).toHaveBeenCalledTimes(3);
    expect(recursos.ajustarVista()).toBe(false);
  });

  it('informa errores durante la restauración del estilo', () => {
    recursos.actualizar(recorrido());
    mapa.fuentes.clear(); mapa.capas.clear();
    mapa.addSource.mockImplementationOnce(() => { throw new Error('Fallo del estilo'); });
    mapa.emitir('style.load');
    expect(error).toHaveBeenCalledOnce();
  });
});

describe('Interfaz Mapa de rutas y paradas', () => {
  const urlRutas = `${API_URL}/rutas`;
  const urlLugares = `${API_URL}/lugares`;
  const urlParadas = `${urlRutas}/7/paradas`;
  const urlOtras = `${urlRutas}/8/paradas`;
  let fixture: ComponentFixture<RutasMapa>;
  let componente: RutasMapa;
  let http: HttpTestingController;
  let mapa: ReturnType<typeof dobles.crearMapa>;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ imports: [RutasMapa], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RutasMapa); componente = fixture.componentInstance;
  });
  afterEach(() => http.verify());

  function iniciar(prepararMapa = true): void {
    fixture.detectChanges(); mapa = dobles.crearMapa.mock.results.at(-1)!.value;
    if (prepararMapa) mapa.emitir('load');
    http.expectOne(urlRutas).flush([ruta, otraRuta]); http.expectOne(urlLugares).flush(lugares);
    fixture.detectChanges();
  }
  function seleccionar(datos: object | null = paradas, id = 7): void {
    componente.seleccionarRuta(id); http.expectOne(id === 7 ? urlParadas : urlOtras).flush(datos); fixture.detectChanges();
  }
  function filas(): HTMLButtonElement[] { return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.punto-opcion')); }

  it('consulta catálogos existentes sin escrituras y espera una ruta antes de pedir paradas', () => {
    iniciar();
    expect(fixture.debugElement.query(By.directive(Mapa))).toBeTruthy();
    expect(dobles.crearMapa).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Mapa de rutas y paradas');
    expect(fixture.nativeElement.textContent).toContain('Selecciona una ruta para consultar');
    http.expectNone(urlParadas); http.expectNone(request => request.method !== 'GET');
  });

  it('selecciona desde el control y presenta origen, destino y paradas ordenadas', () => {
    iniciar();
    const selector = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('#ruta-mapa-selector')!;
    selector.value = '7'; selector.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cargando paradas');
    expect(mapa.addSource).not.toHaveBeenCalled();
    http.expectOne(urlParadas).flush(paradas); fixture.detectChanges();
    expect(filas().map(fila => fila.dataset['punto'])).toEqual(['origen', 'parada:101', 'parada:102', 'parada:103', 'destino']);
    expect(dobles.crearMarcador).toHaveBeenCalledTimes(3);
    expect(fixture.nativeElement.textContent).toContain('3 paradas');
    expect(fixture.nativeElement.textContent).toContain('Trazado referencial');
    expect(fixture.nativeElement.textContent).toContain('no representa un recorrido real');
  });

  it('busca rutas localmente sin borrar una ruta seleccionada ni emitir más HTTP', () => {
    iniciar(); seleccionar();
    componente.busqueda.set(' REGRESO '); fixture.detectChanges();
    expect(componente.rutasFiltradas()).toEqual([otraRuta]);
    expect(componente.rutaId()).toBe(7);
    expect(fixture.nativeElement.textContent).toContain('Seleccionada');
    componente.busqueda.set('inexistente'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay rutas que coincidan');
    http.expectNone(urlRutas);
  });

  it('consulta rutas inactivas y conserva sus datos', () => {
    iniciar(); seleccionar([{ ...parada, rutaId: 8 }], 8);
    expect(componente.rutaSeleccionada()!.activa).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Inactiva');
    expect(mapa.addSource).toHaveBeenCalledOnce();
  });

  it('selecciona desde la lista mostrando cero, null y permisos false sin reconstruir recursos', () => {
    iniciar(); seleccionar();
    const cantidad = dobles.crearMarcador.mock.calls.length;
    filas()[2].click(); fixture.detectChanges();
    expect(componente.seleccionada()).toBe('parada:102');
    expect(filas()[2].getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Tungurahua');
    expect(componente.puntoSeleccionado()!.parada!.kmAcumulado).toBe(0);
    expect(componente.puntoSeleccionado()!.parada!.permiteAscenso).toBe(false);
    expect(mapa.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [-78.62, -1.24] }));
    expect(dobles.crearMarcador).toHaveBeenCalledTimes(cantidad); expect(dobles.crearMapa).toHaveBeenCalledOnce();
  });

  it('selecciona desde el mapa y ofrece todas las funciones del lugar compartido', () => {
    iniciar(); seleccionar();
    dobles.crearMarcador.mock.results[0].value.opciones.element.click(); fixture.detectChanges();
    expect(componente.seleccionada()).toBe('origen');
    const popup = dobles.crearPopup.mock.results.at(-1)!.value;
    Array.from((popup.elemento as HTMLDivElement).querySelectorAll<HTMLButtonElement>('button')).find(boton => boton.textContent.includes('orden 0'))!.click();
    fixture.detectChanges();
    expect(componente.seleccionada()).toBe('parada:101');
    expect(filas()[1].getAttribute('aria-pressed')).toBe('true');
    expect(mapa.easeTo).not.toHaveBeenCalled();
  });

  it('cancela la consulta obsoleta y retira inmediatamente los recursos de la ruta previa', () => {
    iniciar(); seleccionar(); componente.seleccionarPunto('origen');
    const anteriorMarker = dobles.crearMarcador.mock.results[0].value;
    componente.cargarParadas(); const pendiente = http.expectOne(urlParadas);
    componente.seleccionarRuta(8); fixture.detectChanges();
    expect(pendiente.cancelled).toBe(true);
    expect(componente.seleccionada()).toBeNull(); expect(componente.recorrido()).toBeNull();
    expect(anteriorMarker.remove).toHaveBeenCalledOnce(); expect(mapa.fuentes.size).toBe(0);
    http.expectOne(urlOtras).flush([]); fixture.detectChanges();
    expect(componente.recorrido()!.rutaId).toBe(8);
  });

  it('maneja A-B-A conservando el indicador de la última solicitud', () => {
    iniciar(); componente.seleccionarRuta(7); const primera = http.expectOne(urlParadas);
    componente.seleccionarRuta(8); const segunda = http.expectOne(urlOtras);
    componente.seleccionarRuta(7);
    expect(primera.cancelled).toBe(true); expect(segunda.cancelled).toBe(true); expect(componente.cargandoParadas()).toBe(true);
    http.expectOne(urlParadas).flush(paradas); fixture.detectChanges();
    expect(componente.paradas()).toEqual(paradas); expect(componente.cargandoParadas()).toBe(false);
  });

  it('rechaza IDs de ruta inexistentes, evita consultas duplicadas y permite quitar la selección', () => {
    iniciar(); componente.seleccionarRuta(999); expect(componente.rutaId()).toBeNull();
    componente.seleccionarRuta(7); componente.seleccionarRuta(7); componente.cargarParadas();
    http.expectOne(urlParadas).flush(paradas); fixture.detectChanges();
    componente.seleccionarRuta(null); fixture.detectChanges();
    expect(componente.recorrido()).toBeNull(); expect(mapa.fuentes.size).toBe(0);
  });

  it('resuelve la llegada del mapa después de los datos sin duplicar instancias', () => {
    iniciar(false); seleccionar();
    expect(dobles.crearMarcador).not.toHaveBeenCalled();
    mapa.emitir('load'); fixture.detectChanges();
    expect(dobles.crearMarcador).toHaveBeenCalledTimes(3);
    componente.alPrepararMapa(mapa as unknown as MapaLibre);
    expect(dobles.crearMarcador).toHaveBeenCalledTimes(3);
  });

  it('conserva puntos sin ubicación y no dibuja línea con menos de dos válidos', () => {
    iniciar(); componente.lugares.set([lugares[0]]); seleccionar();
    expect(filas()).toHaveLength(5); expect(fixture.nativeElement.textContent).toContain('Sin coordenadas válidas');
    expect(mapa.addSource).not.toHaveBeenCalled();
    componente.seleccionarPunto('parada:102'); fixture.detectChanges();
    expect(componente.puntoSeleccionado()!.lugar).toBeNull(); expect(mapa.easeTo).toHaveBeenCalledOnce();
  });

  it('advierte órdenes inconsistentes y conserva todas las paradas sin inventar línea', () => {
    iniciar(); seleccionar([parada, { ...parada, id: 104, lugarId: 33 }]);
    expect(filas()).toHaveLength(4);
    expect(fixture.nativeElement.textContent).toContain('mismo orden');
    expect(mapa.addSource).not.toHaveBeenCalled();
  });

  it('maneja un catálogo vacío y una ruta sin paradas mostrando sus extremos', () => {
    fixture.detectChanges(); http.expectOne(urlRutas).flush([]); http.expectOne(urlLugares).flush([]); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay rutas registradas');
    componente.cargarRutas(); http.expectOne(urlRutas).flush([ruta]); componente.lugares.set(lugares);
    seleccionar([]);
    expect(filas()).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Esta ruta no tiene paradas registradas');
  });

  it.each([400, 401, 403, 404, 409, 500])('distingue errores HTTP %s y permite reintentar paradas', status => {
    iniciar(); componente.seleccionarRuta(7);
    http.expectOne(urlParadas).flush(null, { status, statusText: 'Error' }); fixture.detectChanges();
    expect(componente.errorParadas()).not.toBeNull(); expect(componente.recorrido()).toBeNull();
    componente.cargarParadas(); http.expectOne(urlParadas).flush(paradas); fixture.detectChanges();
    expect(componente.errorParadas()).toBeNull(); expect(filas()).toHaveLength(5);
  });

  it('gestiona error de red de rutas sin sustituirlo por datos ficticios', () => {
    fixture.detectChanges(); http.expectOne(urlRutas).error(new ProgressEvent('error')); http.expectOne(urlLugares).flush(lugares); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Verifica tu conexión');
    expect(componente.rutas()).toEqual([]);
    componente.cargarRutas(); http.expectOne(urlRutas).flush([ruta]); expect(componente.errorRutas()).toBeNull();
  });

  it('permite consultar relaciones aun cuando falle el catálogo de lugares y recuperarlo después', () => {
    fixture.detectChanges(); mapa = dobles.crearMapa.mock.results.at(-1)!.value; mapa.emitir('load');
    http.expectOne(urlRutas).flush([ruta]); http.expectOne(urlLugares).flush(null, { status: 500, statusText: 'Error' });
    seleccionar(); expect(filas()).toHaveLength(5); expect(mapa.addSource).not.toHaveBeenCalled();
    componente.cargarLugares(); http.expectOne(urlLugares).flush(lugares); fixture.detectChanges();
    expect(mapa.addSource).toHaveBeenCalledOnce(); expect(componente.errorLugares()).toBeNull();
  });

  it('no mezcla una respuesta de paradas de otra ruta y avisa formatos inesperados', () => {
    iniciar(); seleccionar([{ ...parada, rutaId: 8 }]);
    expect(componente.errorParadas()).toContain('no corresponde'); expect(componente.recorrido()).toBeNull();
    componente.cargarRutas(); http.expectOne(urlRutas).flush({ items: [] });
    expect(componente.errorRutas()).toContain('no contiene'); expect(componente.rutaId()).toBeNull();
  });

  it('ajusta la cámara solo inicialmente o por petición del usuario', () => {
    iniciar(); seleccionar(); expect(mapa.fitBounds).toHaveBeenCalledOnce();
    componente.seleccionarPunto('parada:102'); fixture.detectChanges();
    expect(mapa.fitBounds).toHaveBeenCalledOnce();
    componente.mostrarRecorrido(); expect(mapa.fitBounds).toHaveBeenCalledTimes(2);
    componente.cargarParadas(); http.expectOne(urlParadas).flush(paradas); fixture.detectChanges();
    expect(mapa.fitBounds).toHaveBeenCalledTimes(2);
  });

  it('recarga catálogos y paradas y limpia una ruta que haya desaparecido', () => {
    iniciar(); seleccionar(); componente.actualizar();
    http.expectOne(urlRutas).flush([ruta, otraRuta]); http.expectOne(urlLugares).flush(lugares); http.expectOne(urlParadas).flush(paradas); fixture.detectChanges();
    expect(componente.rutaId()).toBe(7);
    componente.actualizar(); http.expectOne(urlRutas).flush([otraRuta]); http.expectOne(urlLugares).flush(lugares); fixture.detectChanges();
    expect(componente.rutaId()).toBeNull(); expect(mapa.fuentes.size).toBe(0);
  });

  it('conserva atribución y nunca ofrece operaciones de escritura', () => {
    iniciar(); seleccionar();
    expect(fixture.nativeElement.textContent).toContain('Natural Earth');
    const botones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map(boton => boton.textContent).join(' ');
    expect(botones).not.toMatch(/Guardar|Eliminar|Desactivar|Nueva ruta/);
    http.expectNone(request => request.method !== 'GET');
  });

  it('cancela consultas y libera recursos completos al destruir la pantalla', () => {
    iniciar(); seleccionar(); componente.seleccionarPunto('origen');
    const marker = dobles.crearMarcador.mock.results[0].value;
    componente.cargarParadas(); const consulta = http.expectOne(urlParadas);
    fixture.destroy(); expect(consulta.cancelled).toBe(true);
    expect(marker.remove).toHaveBeenCalledOnce(); expect(mapa.remove).toHaveBeenCalledOnce();
    expect(mapa.fuentes.size).toBe(0); expect(mapa.capas.size).toBe(0);
  });
});
