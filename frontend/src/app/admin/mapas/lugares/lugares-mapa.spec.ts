import { ESTILO_MAPA_OSM } from '../../../shared/maps/mapa.config';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { Map as MapaLibre, MapOptions } from 'maplibre-gl';

import { API_URL } from '../../../services/api.config';
import { Mapa } from '../../../shared/maps/mapa';
import { LugarDto } from '../../lugares/lugar.model';
import { LugaresMapa } from './lugares-mapa';
import { MarcadoresLugares } from './marcadores-lugares';

const dobles = vi.hoisted(() => {
  class MapaSimulado {
    readonly eventos = new Map<string, (evento?: unknown) => void>();
    readonly on = vi.fn((tipo: string, listener: (evento?: unknown) => void) => { this.eventos.set(tipo, listener); return this; });
    readonly off = vi.fn((tipo: string) => { this.eventos.delete(tipo); return this; });
    readonly addControl = vi.fn();
    readonly getZoom = vi.fn(() => 5);
    readonly getContainer = vi.fn(() => this.opciones.container as HTMLElement);
    readonly fitBounds = vi.fn();
    readonly easeTo = vi.fn();
    readonly jumpTo = vi.fn();
    readonly resize = vi.fn();
    readonly setStyle = vi.fn();
    readonly remove = vi.fn(() => { this.eventos.get('remove')?.(); this.eventos.clear(); });
    constructor(readonly opciones: MapOptions) {}
  }

  class MarcadorSimulado {
    readonly setLngLat = vi.fn((_coordenadas: unknown) => this);
    readonly addTo = vi.fn((mapa: MapaSimulado) => { mapa.getContainer().append(this.opciones.element); return this; });
    readonly remove = vi.fn(() => { this.opciones.element.remove(); return this; });
    constructor(readonly opciones: { element: HTMLElement }) {}
  }

  class PopupSimulado {
    readonly elemento = document.createElement('div');
    contenido: Node | null = null;
    readonly setLngLat = vi.fn((_coordenadas: unknown) => this);
    readonly setDOMContent = vi.fn((contenido: Node) => { this.contenido = contenido; this.elemento.replaceChildren(contenido); return this; });
    readonly addTo = vi.fn((mapa: MapaSimulado) => { mapa.getContainer().append(this.elemento); return this; });
    readonly remove = vi.fn(() => { this.elemento.remove(); return this; });
  }

  class LimitesSimulados {
    readonly coordenadas: unknown[] = [];
    extend(coordenadas: unknown): this { this.coordenadas.push(coordenadas); return this; }
  }

  return {
    crearMapa: vi.fn(function (opciones: MapOptions) { return new MapaSimulado(opciones); }),
    crearMarcador: vi.fn(function (opciones: { element: HTMLElement }) { return new MarcadorSimulado(opciones); }),
    crearPopup: vi.fn(function (_opciones: unknown) { return new PopupSimulado(); }),
    crearLimites: vi.fn(function () { return new LimitesSimulados(); }),
    crearControl: vi.fn(function () { return {}; }),
    getWorkerUrl: vi.fn(() => '/worker-de-prueba.mjs'),
    setWorkerUrl: vi.fn()
  };
});

vi.mock('maplibre-gl', () => ({
  Map: dobles.crearMapa, Marker: dobles.crearMarcador, Popup: dobles.crearPopup,
  LngLatBounds: dobles.crearLimites, NavigationControl: dobles.crearControl,
  getWorkerUrl: dobles.getWorkerUrl, setWorkerUrl: dobles.setWorkerUrl
}));

const quito: LugarDto = { id: 11, nombre: 'Quito', provincia: 'Pichincha', canton: 'Quito', tipo: 'CIUDAD', ubicacion: { latitud: -0.18, longitud: -78.46 }, activo: true };
const cuenca: LugarDto = { id: 22, nombre: 'Cuenca', provincia: 'Azuay', canton: 'Cuenca', tipo: 'TERMINAL', ubicacion: { latitud: -2.9, longitud: -79 }, activo: false };
const sinUbicacion: LugarDto = { id: 33, nombre: 'Sin ubicación', provincia: null, canton: null, tipo: 'PARADA', ubicacion: null, activo: true };

describe('Recursos de marcadores de lugares', () => {
  let gestor: MarcadoresLugares;
  let mapa: ReturnType<typeof dobles.crearMapa>;
  let seleccionar = vi.fn<(id: number) => void>();

  beforeEach(() => {
    vi.clearAllMocks();
    mapa = new dobles.crearMapa({ container: document.createElement('div') });
    seleccionar = vi.fn<(id: number) => void>();
    gestor = new MarcadoresLugares(mapa as unknown as MapaLibre, document, seleccionar);
  });

  afterEach(() => gestor.destruir());

  it('crea marcadores solo para lugares válidos y respeta [longitud, latitud]', () => {
    gestor.actualizar([quito, cuenca, sinUbicacion, { ...quito, id: 44, ubicacion: { latitud: 200, longitud: 0 } }]);
    expect(dobles.crearMarcador).toHaveBeenCalledTimes(2);
    expect(dobles.crearMarcador.mock.results[0].value.setLngLat).toHaveBeenCalledWith([-78.46, -0.18]);
    expect(dobles.crearMarcador.mock.results[1].value.setLngLat).toHaveBeenCalledWith([-79, -2.9]);
  });

  it('no duplica marcadores con el mismo ID', () => {
    gestor.actualizar([quito, quito]);
    expect(dobles.crearMarcador).toHaveBeenCalledOnce();
  });

  it('retira los anteriores y sus listeners antes de actualizar el conjunto', () => {
    gestor.actualizar([quito, cuenca]);
    const anteriores = dobles.crearMarcador.mock.results.map(resultado => resultado.value);
    gestor.actualizar([cuenca]);
    for (const marcador of anteriores) {
      expect(marcador.remove).toHaveBeenCalledOnce();
      marcador.opciones.element.click();
    }
    expect(seleccionar).not.toHaveBeenCalled();
    expect(mapa.getContainer().querySelectorAll('button')).toHaveLength(1);
  });

  it('selecciona con el botón del marcador y ofrece una etiqueta accesible', () => {
    gestor.actualizar([quito]);
    const elemento = dobles.crearMarcador.mock.results[0].value.opciones.element;
    expect(elemento.tagName).toBe('BUTTON');
    expect(elemento.getAttribute('aria-label')).toBe('Seleccionar Quito');
    elemento.click();
    expect(seleccionar).toHaveBeenCalledExactlyOnceWith(11);
  });

  it('resalta la selección y mantiene distintos los estados activo e inactivo', () => {
    gestor.actualizar([quito, cuenca]);
    const primero = dobles.crearMarcador.mock.results[0].value.opciones.element;
    const segundo = dobles.crearMarcador.mock.results[1].value.opciones.element;
    expect(primero.classList.contains('btn-primary')).toBe(true);
    expect(segundo.classList.contains('btn-secondary')).toBe(true);
    gestor.seleccionar(22);
    expect(segundo.getAttribute('aria-pressed')).toBe('true');
    expect(segundo.classList.contains('btn-warning')).toBe(true);
    gestor.seleccionar(null);
    expect(segundo.classList.contains('btn-secondary')).toBe(true);
  });

  it('inserta nombres como texto seguro en el popup y no ejecuta HTML recibido', () => {
    const nombre = '<img src=x onerror="alert(1)"><script>malicioso()</script>';
    gestor.actualizar([{ ...quito, nombre }]);
    gestor.seleccionar(11);
    const popup = dobles.crearPopup.mock.results[0].value;
    expect(popup.setDOMContent).toHaveBeenCalledOnce();
    expect(popup.elemento.textContent).toContain(nombre);
    expect(popup.elemento.querySelector('img,script')).toBeNull();
    expect(popup.elemento.textContent).toContain('Activo');
    expect(popup.elemento.textContent).toContain('Longitud: -78.46');
  });

  it('cierra el popup anterior al seleccionar otro lugar, uno sin ubicación o al recargar', () => {
    gestor.actualizar([quito, cuenca, sinUbicacion]);
    gestor.seleccionar(11);
    const primero = dobles.crearPopup.mock.results[0].value;
    gestor.seleccionar(22);
    expect(primero.remove).toHaveBeenCalledOnce();
    const segundo = dobles.crearPopup.mock.results[1].value;
    gestor.seleccionar(33);
    expect(segundo.remove).toHaveBeenCalledOnce();
    expect(dobles.crearPopup).toHaveBeenCalledTimes(2);
    gestor.seleccionar(11);
    const tercero = dobles.crearPopup.mock.results[2].value;
    gestor.actualizar([cuenca]);
    expect(tercero.remove).toHaveBeenCalledOnce();
  });

  it('centra suavemente solo los lugares representados y conserva un zoom más cercano', () => {
    gestor.actualizar([quito, sinUbicacion]);
    mapa.getZoom.mockReturnValue(14);
    expect(gestor.centrar(11)).toBe(true);
    expect(mapa.easeTo).toHaveBeenCalledWith({ center: [-78.46, -0.18], zoom: 14, duration: 450 });
    expect(gestor.centrar(33)).toBe(false);
    expect(mapa.easeTo).toHaveBeenCalledOnce();
  });

  it('ajusta límites con puntos válidos y un margen proporcional en contenedores pequeños', () => {
    const elemento = mapa.getContainer();
    Object.defineProperties(elemento, { clientWidth: { value: 200 }, clientHeight: { value: 150 } });
    gestor.actualizar([quito, cuenca, sinUbicacion]);
    expect(gestor.ajustarVista()).toBe(true);
    expect(dobles.crearLimites.mock.results[0].value.coordenadas).toEqual([[-78.46, -0.18], [-79, -2.9]]);
    expect(mapa.fitBounds).toHaveBeenCalledWith(dobles.crearLimites.mock.results[0].value, { padding: 30, maxZoom: 12, duration: 450 });
  });

  it('maneja un solo marcador y no inventa límites para un conjunto vacío', () => {
    gestor.actualizar([quito]);
    expect(gestor.ajustarVista()).toBe(true);
    expect(mapa.easeTo).toHaveBeenCalledOnce();
    expect(mapa.fitBounds).not.toHaveBeenCalled();
    gestor.actualizar([sinUbicacion]);
    expect(gestor.ajustarVista()).toBe(false);
    expect(mapa.easeTo).toHaveBeenCalledOnce();
  });

  it('destruye sus recursos y listeners sin eliminar el mapa del componente reutilizable', () => {
    gestor.actualizar([quito]);
    gestor.seleccionar(11);
    const marcador = dobles.crearMarcador.mock.results[0].value;
    const popup = dobles.crearPopup.mock.results[0].value;
    gestor.destruir();
    gestor.destruir();
    marcador.opciones.element.click();
    expect(marcador.remove).toHaveBeenCalledOnce();
    expect(popup.remove).toHaveBeenCalledOnce();
    expect(seleccionar).not.toHaveBeenCalled();
    expect(mapa.remove).not.toHaveBeenCalled();
    expect(mapa.off).toHaveBeenCalledWith('remove', expect.any(Function));
    gestor.actualizar([cuenca]);
    expect(dobles.crearMarcador).toHaveBeenCalledOnce();
  });

  it('también limpia los marcadores cuando el mapa propietario emite remove', () => {
    gestor.actualizar([quito]);
    const marcador = dobles.crearMarcador.mock.results[0].value;
    mapa.remove();
    expect(marcador.remove).toHaveBeenCalledOnce();
    expect(gestor.ajustarVista()).toBe(false);
  });

  it('limpia marcadores parcialmente creados si falla su incorporación al mapa', () => {
    const original = dobles.crearMarcador.getMockImplementation()!;
    dobles.crearMarcador.mockImplementationOnce(function (opciones) {
      const marcador = original(opciones);
      marcador.addTo.mockImplementationOnce(() => { throw new Error('Fallo gráfico'); });
      return marcador;
    });
    expect(() => gestor.actualizar([quito])).toThrow('Fallo gráfico');
    expect(dobles.crearMarcador.mock.results[0].value.remove).toHaveBeenCalledOnce();
    expect(gestor.ajustarVista()).toBe(false);
  });
});

describe('Interfaz Mapa de lugares', () => {
  const url = `${API_URL}/lugares`;
  let fixture: ComponentFixture<LugaresMapa>;
  let componente: LugaresMapa;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ imports: [LugaresMapa], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LugaresMapa);
    componente = fixture.componentInstance;
  });

  afterEach(() => http.verify());

  function iniciar(lugares: object | null = [quito, cuenca, sinUbicacion], prepararMapa = true): ReturnType<typeof dobles.crearMapa> {
    fixture.detectChanges();
    const mapa = dobles.crearMapa.mock.results.at(-1)!.value;
    if (prepararMapa) mapa.eventos.get('load')!();
    http.expectOne(url).flush(lugares);
    fixture.detectChanges();
    return mapa;
  }

  function filas(): HTMLButtonElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.lugar-opcion'));
  }

  it('carga a través de LugarService y reutiliza app-mapa sin otra inicialización', () => {
    iniciar();
    expect(fixture.debugElement.query(By.directive(Mapa))).toBeTruthy();
    expect(dobles.crearMapa).toHaveBeenCalledOnce();
    expect(dobles.crearMarcador).toHaveBeenCalledTimes(2);
    expect(filas()).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('Mapa de lugares');
    expect(fixture.nativeElement.textContent).toContain('3 de 3 lugares');
    expect(fixture.nativeElement.textContent).toContain('1 sin coordenadas válidas');
  });

  it('muestra carga, bloquea consultas duplicadas y no realiza escrituras HTTP', () => {
    fixture.detectChanges();
    componente.cargar();
    expect(fixture.nativeElement.textContent).toContain('Cargando lugares...');
    const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
    fixture.detectChanges();
    expect(componente.cargando()).toBe(false);
    http.expectNone(request => request.method !== 'GET');
  });

  it('espera mapaListo si los datos llegan antes del mapa', () => {
    const mapa = iniciar([quito], false);
    expect(dobles.crearMarcador).not.toHaveBeenCalled();
    mapa.eventos.get('load')!();
    fixture.detectChanges();
    expect(dobles.crearMarcador).toHaveBeenCalledOnce();
    expect(mapa.easeTo).toHaveBeenCalledOnce();
    componente.alPrepararMapa(mapa as unknown as MapaLibre);
    expect(dobles.crearMarcador).toHaveBeenCalledOnce();
  });

  it('busca por nombre en memoria y sincroniza lista y marcadores', () => {
    iniciar();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#mapa-busqueda')!;
    input.value = ' QUITO ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(filas()).toHaveLength(1);
    expect(filas()[0].textContent).toContain('Quito');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.mapa-contenedor button')).toHaveLength(1);
    http.expectNone(url);
  });

  it('filtra activos e inactivos sin excluirlos de la consulta original', () => {
    iniciar();
    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('#mapa-estado')!;
    select.value = 'inactivo';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(filas()).toHaveLength(1);
    expect(filas()[0].textContent).toContain('Cuenca');
    componente.filtroEstado.set('activo');
    fixture.detectChanges();
    expect(filas()).toHaveLength(2);
    componente.limpiarFiltros();
    fixture.detectChanges();
    expect(filas()).toHaveLength(3);
    http.expectNone(url);
  });

  it('selecciona desde la lista, muestra datos reales y centra sin crear marcadores nuevos', () => {
    const mapa = iniciar();
    const cantidad = dobles.crearMarcador.mock.calls.length;
    filas()[0].click();
    fixture.detectChanges();
    expect(componente.seleccionado()?.id).toBe(11);
    expect(filas()[0].getAttribute('aria-pressed')).toBe('true');
    expect(filas()[0].classList.contains('seleccionado')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Pichincha');
    expect(fixture.nativeElement.textContent).toContain('-78.46');
    expect(mapa.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [-78.46, -0.18] }));
    expect(dobles.crearMarcador).toHaveBeenCalledTimes(cantidad);
    expect(dobles.crearMapa).toHaveBeenCalledOnce();
  });

  it('selecciona desde el marcador sin ciclos, sin mover la cámara ni recrear el conjunto', () => {
    const mapa = iniciar();
    const cantidad = dobles.crearMarcador.mock.calls.length;
    dobles.crearMarcador.mock.results[1].value.opciones.element.click();
    fixture.detectChanges();
    expect(componente.seleccionado()?.id).toBe(22);
    expect(filas()[1].getAttribute('aria-pressed')).toBe('true');
    expect(mapa.easeTo).not.toHaveBeenCalled();
    expect(dobles.crearMarcador).toHaveBeenCalledTimes(cantidad);
    expect(dobles.crearPopup).toHaveBeenCalledOnce();
  });

  it('consulta un lugar sin coordenadas sin mover la cámara a un punto inventado', () => {
    const mapa = iniciar();
    filas()[2].click();
    fixture.detectChanges();
    expect(componente.seleccionado()?.id).toBe(33);
    expect(componente.coordenadasSeleccionadas()).toBeNull();
    expect(mapa.easeTo).not.toHaveBeenCalled();
    expect(dobles.crearPopup).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Este lugar no tiene coordenadas válidas');
  });

  it('centra una selección realizada antes de que el mapa termine de cargar', () => {
    const mapa = iniciar([quito, cuenca], false);
    componente.seleccionar(22);
    mapa.eventos.get('load')!();
    fixture.detectChanges();
    expect(mapa.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [-79, -2.9] }));
    expect(mapa.fitBounds).not.toHaveBeenCalled();
  });

  it('limpia la selección y el popup si el filtro oculta el lugar y no la restaura automáticamente', () => {
    iniciar();
    componente.seleccionar(11);
    const popup = dobles.crearPopup.mock.results[0].value;
    componente.busqueda.set('Cuenca');
    fixture.detectChanges();
    expect(componente.seleccionado()).toBeNull();
    expect(componente.seleccionadoId()).toBeNull();
    expect(popup.remove).toHaveBeenCalledOnce();
    componente.limpiarFiltros();
    fixture.detectChanges();
    expect(componente.seleccionado()).toBeNull();
  });

  it('ajusta todos los puntos una vez y permite volver a ajustar explícitamente', () => {
    const mapa = iniciar();
    expect(mapa.fitBounds).toHaveBeenCalledOnce();
    componente.busqueda.set('Quito');
    fixture.detectChanges();
    expect(mapa.fitBounds).toHaveBeenCalledOnce();
    expect(mapa.easeTo).not.toHaveBeenCalled();
    componente.mostrarTodos();
    expect(mapa.easeTo).toHaveBeenCalledOnce();
    componente.limpiarFiltros();
    fixture.detectChanges();
    componente.mostrarTodos();
    expect(mapa.fitBounds).toHaveBeenCalledTimes(2);
  });

  it('distingue sin registros, sin coincidencias y resultados sin coordenadas', () => {
    const mapa = iniciar([]);
    expect(fixture.nativeElement.textContent).toContain('No hay lugares registrados');
    expect(mapa.fitBounds).not.toHaveBeenCalled();
    componente.cargar();
    http.expectOne(url).flush([sinUbicacion]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Los resultados no tienen coordenadas válidas');
    componente.busqueda.set('inexistente');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay lugares que coincidan');
    expect(mapa.easeTo).not.toHaveBeenCalled();
    expect(mapa.fitBounds).not.toHaveBeenCalled();
  });

  it('mantiene la lista disponible para ubicaciones inválidas sin representarlas', () => {
    iniciar([{ ...quito, ubicacion: { latitud: 95, longitud: -78 } }]);
    expect(filas()).toHaveLength(1);
    expect(dobles.crearMarcador).not.toHaveBeenCalled();
    expect(componente.sinCoordenadas()).toBe(1);
  });

  it('gestiona errores de red y permite reintentar sin datos ficticios', () => {
    fixture.detectChanges();
    http.expectOne(url).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Verifica tu conexión');
    expect(componente.cargando()).toBe(false);
    expect(componente.lugares()).toEqual([]);
    componente.cargar();
    http.expectOne(url).flush([quito]);
    fixture.detectChanges();
    expect(componente.error()).toBeNull();
    expect(filas()).toHaveLength(1);
  });

  it.each([
    [400, 'Revisa los datos'], [401, 'sesión'], [403, 'permisos'], [404, 'no está disponible'], [500, 'servidor']
  ])('muestra un mensaje comprensible para HTTP %s', (status, mensaje) => {
    fixture.detectChanges();
    http.expectOne(url).flush(null, { status: Number(status), statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(mensaje);
  });

  it.each([null, {}, { items: [] }, [{ id: 'incorrecto' }]])('informa respuestas inesperadas: %o', respuesta => {
    iniciar(respuesta);
    expect(componente.error()).toContain('no contiene una lista de lugares válida');
    expect(componente.lugares()).toEqual([]);
    expect(dobles.crearMarcador).not.toHaveBeenCalled();
  });

  it('recarga datos, reemplaza marcadores y actualiza el popup sin perder una selección válida', () => {
    const mapa = iniciar();
    componente.seleccionar(11);
    const marcador = dobles.crearMarcador.mock.results[0].value;
    const popup = dobles.crearPopup.mock.results[0].value;
    componente.cargar();
    http.expectOne(url).flush([{ ...quito, nombre: 'Quito actualizado', ubicacion: { latitud: 0, longitud: -78 } }]);
    fixture.detectChanges();
    expect(marcador.remove).toHaveBeenCalledOnce();
    expect(popup.remove).toHaveBeenCalledOnce();
    expect(componente.seleccionado()?.nombre).toBe('Quito actualizado');
    expect(dobles.crearPopup.mock.results.at(-1)!.value.elemento.textContent).toContain('Quito actualizado');
    expect(mapa.fitBounds).toHaveBeenCalledOnce();
  });

  it('borra una selección que ya no aparece después de recargar', () => {
    iniciar();
    componente.seleccionar(11);
    componente.cargar();
    http.expectOne(url).flush([cuenca]);
    fixture.detectChanges();
    expect(componente.seleccionadoId()).toBeNull();
    expect(dobles.crearPopup).toHaveBeenCalledOnce();
  });

  it('deduplica IDs y no genera marcadores duplicados en la interfaz', () => {
    iniciar([quito, quito]);
    expect(filas()).toHaveLength(1);
    expect(dobles.crearMarcador).toHaveBeenCalledOnce();
  });

  it('conserva créditos y atribución del componente reutilizable', () => {
    iniciar();
    expect(fixture.nativeElement.textContent).not.toContain('Natural Earth');
    expect(dobles.crearMapa).toHaveBeenCalledWith(expect.objectContaining({ style: ESTILO_MAPA_OSM, attributionControl: { compact: false } }));
    expect(ESTILO_MAPA_OSM.sources['osm-raster'].attribution).toContain('OpenStreetMap');
    expect(dobles.crearMapa).toHaveBeenCalledWith(expect.objectContaining({ attributionControl: { compact: false } }));
  });

  it('no permite seleccionar IDs ajenos a los resultados visibles', () => {
    iniciar();
    componente.seleccionar(999);
    expect(componente.seleccionadoId()).toBeNull();
    componente.busqueda.set('Cuenca');
    fixture.detectChanges();
    componente.seleccionar(11);
    expect(componente.seleccionadoId()).toBeNull();
  });

  it('retira listeners, popups, marcadores y el mapa al destruir la vista', () => {
    const mapa = iniciar();
    componente.seleccionar(11);
    const marcador = dobles.crearMarcador.mock.results[0].value;
    const popup = dobles.crearPopup.mock.results[0].value;
    fixture.destroy();
    marcador.opciones.element.click();
    expect(marcador.remove).toHaveBeenCalledOnce();
    expect(popup.remove).toHaveBeenCalledOnce();
    expect(mapa.remove).toHaveBeenCalledOnce();
    expect(mapa.eventos.size).toBe(0);
  });

  it('cancela la consulta pendiente al destruir el visualizador', () => {
    fixture.detectChanges();
    const peticion = http.expectOne(url);
    fixture.destroy();
    expect(peticion.cancelled).toBe(true);
  });
});
