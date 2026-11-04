import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mapa } from './mapa';
import { CENTRO_ECUADOR, ESTILO_MAPA_OSM, MAPA_ESTILO_BASE, MAPA_WORKER_URL, ZOOM_ECUADOR } from './mapa.config';

const dobles = vi.hoisted(() => {
  class MapaSimulado {
    readonly eventos = new globalThis.Map<string, (evento?: unknown) => void>();
    readonly on = vi.fn((tipo: string, listener: (evento?: unknown) => void) => {
      this.eventos.set(tipo, listener);
      return this;
    });
    readonly off = vi.fn((tipo: string) => {
      this.eventos.delete(tipo);
      return this;
    });
    readonly addControl = vi.fn();
    readonly jumpTo = vi.fn();
    readonly setStyle = vi.fn();
    readonly resize = vi.fn();
    readonly remove = vi.fn();
  }

  return {
    workerUrl: '',
    crearMapa: vi.fn(function (_opciones: unknown) { return new MapaSimulado(); }),
    crearNavegacion: vi.fn(function (_opciones: unknown) { return {}; }),
    getWorkerUrl: vi.fn<() => string>(),
    setWorkerUrl: vi.fn<(url: string) => void>()
  };
});

vi.mock('maplibre-gl', () => ({
  Map: dobles.crearMapa,
  NavigationControl: dobles.crearNavegacion,
  getWorkerUrl: dobles.getWorkerUrl,
  setWorkerUrl: dobles.setWorkerUrl
}));

describe('Mapa reutilizable', () => {
  let fixture: ComponentFixture<Mapa>;

  beforeEach(() => {
    vi.clearAllMocks();
    dobles.workerUrl = '';
    dobles.getWorkerUrl.mockImplementation(() => dobles.workerUrl);
    dobles.setWorkerUrl.mockImplementation(url => { dobles.workerUrl = url; });
    TestBed.configureTestingModule({ imports: [Mapa] });
    fixture = TestBed.createComponent(Mapa);
  });

  function iniciar(): ReturnType<typeof dobles.crearMapa> {
    fixture.detectChanges();
    return dobles.crearMapa.mock.results.at(-1)!.value;
  }

  function emitir(tipo: string, evento?: unknown): void {
    const mapa = dobles.crearMapa.mock.results.at(-1)!.value;
    mapa.eventos.get(tipo)!(evento);
    fixture.detectChanges();
  }

  it('crea el componente sin inicializar el mapa antes de que exista su vista', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(dobles.crearMapa).not.toHaveBeenCalled();
    expect(fixture.componentInstance.cargando()).toBe(true);
  });

  it('inicializa con su propio contenedor, la vista de Ecuador y atribución expandida', () => {
    const mapa = iniciar();
    expect(dobles.crearMapa).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      container: (fixture.nativeElement as HTMLElement).querySelector('.mapa-contenedor'),
      center: CENTRO_ECUADOR,
      zoom: ZOOM_ECUADOR,
      style: ESTILO_MAPA_OSM,
      trackResize: true,
      attributionControl: { compact: false }
    }));
    expect(mapa.on.mock.calls.map(([tipo]) => tipo)).toEqual(['load', 'style.load', 'error']);
    expect(mapa.addControl).toHaveBeenCalledOnce();
    expect(dobles.crearNavegacion).toHaveBeenCalledWith({ showCompass: false });
    expect(fixture.nativeElement.textContent).toContain('Cargando mapa...');
  });

  it('respeta centro, zoom cero, estilo y etiqueta configurados antes de inicializar', () => {
    const estilo = { version: 8, sources: {}, layers: [] };
    fixture.componentRef.setInput('centro', [-80, 0]);
    fixture.componentRef.setInput('zoom', 0);
    fixture.componentRef.setInput('estilo', estilo);
    fixture.componentRef.setInput('etiqueta', 'Vista geográfica de prueba');
    iniciar();
    expect(dobles.crearMapa).toHaveBeenCalledWith(expect.objectContaining({
      center: [-80, 0], zoom: 0, style: estilo,
      locale: expect.objectContaining({ 'Map.Title': 'Vista geográfica de prueba' })
    }));
    expect((fixture.nativeElement as HTMLElement).querySelector('section')!.getAttribute('aria-label')).toBe('Vista geográfica de prueba');
  });

  it('configura el worker de la misma versión instalada para el empaquetador', () => {
    iniciar();
    expect(dobles.setWorkerUrl).toHaveBeenCalledExactlyOnceWith('https://cdn.jsdelivr.net/npm/maplibre-gl@6.14.0/dist/maplibre-gl-worker.mjs');
  });

  it('admite un worker alojado por el consumidor sin modificar la configuración global de Angular', () => {
    fixture.destroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Mapa], providers: [{ provide: MAPA_WORKER_URL, useValue: '/assets/maplibre/worker.mjs' }] });
    fixture = TestBed.createComponent(Mapa);
    iniciar();
    expect(dobles.setWorkerUrl).toHaveBeenCalledExactlyOnceWith('/assets/maplibre/worker.mjs');
  });

  it('respeta un worker de MapLibre ya configurado', () => {
    dobles.workerUrl = '/worker-preconfigurado.mjs';
    iniciar();
    expect(dobles.setWorkerUrl).not.toHaveBeenCalled();
  });

  it('emite la instancia lista después de load y retira el indicador de carga', () => {
    const listo = vi.fn();
    fixture.componentInstance.mapaListo.subscribe(listo);
    const mapa = iniciar();
    expect(listo).not.toHaveBeenCalled();
    emitir('load');
    expect(listo).toHaveBeenCalledExactlyOnceWith(mapa);
    expect(fixture.componentInstance.cargando()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Cargando mapa...');
    expect((fixture.nativeElement as HTMLElement).querySelector('section')!.getAttribute('aria-busy')).toBe('false');
  });

  it('puede informar estilo cargado sin emitir prematuramente el evento de mapa listo', () => {
    const listo = vi.fn();
    fixture.componentInstance.mapaListo.subscribe(listo);
    iniciar();
    emitir('style.load');
    expect(fixture.componentInstance.cargando()).toBe(false);
    expect(listo).not.toHaveBeenCalled();
  });

  it('conserva la atribucion nativa expandida sin creditos del antiguo mapa politico', () => {
    iniciar();
    expect((fixture.nativeElement as HTMLElement).querySelector('footer')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Natural Earth');
    expect(fixture.componentInstance.estilo()).toBe(ESTILO_MAPA_OSM);
    expect(dobles.crearMapa).toHaveBeenCalledWith(expect.objectContaining({ attributionControl: { compact: false } }));
  });

  it('permite sustituir el proveedor desde DI sin modificar los consumidores', () => {
    fixture.destroy(); TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Mapa], providers: [{ provide: MAPA_ESTILO_BASE, useValue: '/mapas/proveedor-aprobado.json' }] });
    fixture = TestBed.createComponent(Mapa); iniciar();
    expect(dobles.crearMapa).toHaveBeenCalledWith(expect.objectContaining({ style: '/mapas/proveedor-aprobado.json' }));
  });

  it('un fallo de teselas no reconstruye el mapa ni bloquea controles o redimensionamiento', () => {
    const mapa = iniciar(); emitir('load');
    emitir('error', { error: new Error('Tile 503') });
    fixture.componentInstance.redimensionar();
    expect(mapa.resize).toHaveBeenCalledOnce(); expect(mapa.remove).not.toHaveBeenCalled();
    expect(dobles.crearMapa).toHaveBeenCalledOnce(); expect(mapa.addControl).toHaveBeenCalledOnce();
    expect((fixture.nativeElement as HTMLElement).querySelector('.mapa-contenedor')).toBeTruthy();
    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('informa un error de inicialización sin mostrar detalles técnicos', () => {
    const causa = new Error('Detalle técnico WebGL');
    dobles.crearMapa.mockImplementationOnce(function () { throw causa; });
    const fallo = vi.fn();
    fixture.componentInstance.falloMapa.subscribe(fallo);
    fixture.detectChanges();
    expect(fixture.componentInstance.cargando()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No se pudo iniciar el mapa en este navegador.');
    expect(fixture.nativeElement.textContent).not.toContain('Detalle técnico WebGL');
    expect(fallo).toHaveBeenCalledExactlyOnceWith(causa);
    expect((fixture.nativeElement as HTMLElement).querySelector('[role=alert]')).toBeTruthy();
    fixture.componentInstance.ngAfterViewInit();
    expect(dobles.crearMapa).toHaveBeenCalledOnce();
  });

  it('muestra errores asíncronos de cartografía y expone su causa al consumidor', () => {
    const causa = new Error('https://fuente.example.test/error-tecnico');
    const fallo = vi.fn();
    fixture.componentInstance.falloMapa.subscribe(fallo);
    iniciar();
    emitir('error', { error: causa });
    expect(fixture.componentInstance.cargando()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No se pudo cargar parte del mapa');
    expect(fixture.nativeElement.textContent).not.toContain(causa.message);
    expect(fallo).toHaveBeenCalledExactlyOnceWith(causa);
  });

  it('limpia el error tras la carga correcta de un nuevo estilo', () => {
    iniciar();
    emitir('error', { error: new Error('Sin conexión') });
    fixture.componentRef.setInput('estilo', '/mapas/estilo.json');
    fixture.detectChanges();
    expect(fixture.componentInstance.error()).toBeNull();
    expect(fixture.componentInstance.cargando()).toBe(true);
    emitir('style.load');
    expect(fixture.componentInstance.error()).toBeNull();
    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('actualiza únicamente el centro sin reiniciar el zoom ni crear otro mapa', () => {
    const mapa = iniciar();
    fixture.componentRef.setInput('centro', [-79, -2]);
    fixture.detectChanges();
    expect(mapa.jumpTo).toHaveBeenCalledExactlyOnceWith({ center: [-79, -2] });
    expect(dobles.crearMapa).toHaveBeenCalledOnce();
  });

  it('actualiza únicamente el zoom sin reiniciar el centro', () => {
    const mapa = iniciar();
    fixture.componentRef.setInput('zoom', 0);
    fixture.detectChanges();
    expect(mapa.jumpTo).toHaveBeenCalledExactlyOnceWith({ zoom: 0 });
    expect(dobles.crearMapa).toHaveBeenCalledOnce();
  });

  it('actualiza centro y zoom juntos mediante una sola operación de cámara', () => {
    const mapa = iniciar();
    fixture.componentRef.setInput('centro', [-79, -2]);
    fixture.componentRef.setInput('zoom', 8);
    fixture.detectChanges();
    expect(mapa.jumpTo).toHaveBeenCalledExactlyOnceWith({ center: [-79, -2], zoom: 8 });
  });

  it('cambia el estilo sin recrear el mapa y conserva la atribución nativa del proveedor', () => {
    const mapa = iniciar();
    fixture.componentRef.setInput('estilo', '/mapas/aprobado.json');
    fixture.detectChanges();
    expect(mapa.setStyle).toHaveBeenCalledExactlyOnceWith('/mapas/aprobado.json');
    expect(dobles.crearMapa).toHaveBeenCalledOnce();
    expect((fixture.nativeElement as HTMLElement).querySelector('footer')).toBeNull();
  });

  it('cambia la etiqueta accesible sin alterar cámara ni estilo', () => {
    const mapa = iniciar();
    fixture.componentRef.setInput('etiqueta', 'Otra vista');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('section')!.getAttribute('aria-label')).toBe('Otra vista');
    expect(mapa.jumpTo).not.toHaveBeenCalled();
    expect(mapa.setStyle).not.toHaveBeenCalled();
  });

  it('no duplica inicializaciones durante ciclos de detección de cambios', () => {
    iniciar();
    fixture.detectChanges();
    fixture.componentInstance.ngAfterViewInit();
    fixture.componentInstance.ngAfterViewInit();
    expect(dobles.crearMapa).toHaveBeenCalledOnce();
  });

  it('delega cambios de tamaño al observador nativo de MapLibre y permite resize explícito', () => {
    const mapa = iniciar();
    expect(dobles.crearMapa).toHaveBeenCalledWith(expect.objectContaining({ trackResize: true }));
    fixture.componentInstance.redimensionar();
    expect(mapa.resize).toHaveBeenCalledOnce();
    expect(dobles.crearMapa).toHaveBeenCalledOnce();
  });

  it('retira listeners y libera el mapa exactamente una vez al destruir', () => {
    const mapa = iniciar();
    const listeners = new globalThis.Map(mapa.eventos);
    fixture.destroy();
    fixture.componentInstance.ngOnDestroy();
    expect(mapa.remove).toHaveBeenCalledOnce();
    for (const [tipo, listener] of listeners) expect(mapa.off).toHaveBeenCalledWith(tipo, listener);
    expect(mapa.eventos.size).toBe(0);
  });

  it('ignora callbacks y redimensionamientos pendientes después de destruir', () => {
    const listo = vi.fn();
    const fallo = vi.fn();
    fixture.componentInstance.mapaListo.subscribe(listo);
    fixture.componentInstance.falloMapa.subscribe(fallo);
    const mapa = iniciar();
    const cargar = mapa.eventos.get('load')!;
    const error = mapa.eventos.get('error')!;
    fixture.destroy();
    cargar();
    error({ error: new Error('Tardío') });
    fixture.componentInstance.redimensionar();
    expect(listo).not.toHaveBeenCalled();
    expect(fallo).not.toHaveBeenCalled();
    expect(mapa.resize).not.toHaveBeenCalled();
  });

  it('no inicializa después de destruir una instancia cuya vista nunca se creó', () => {
    fixture.destroy();
    fixture.componentInstance.ngAfterViewInit();
    fixture.componentInstance.redimensionar();
    expect(dobles.crearMapa).not.toHaveBeenCalled();
  });

  it('libera recursos si falla la configuración posterior al constructor', () => {
    dobles.crearMapa.mockImplementationOnce(function () {
      const mapa = dobles.crearMapa.getMockImplementation()!({});
      mapa.addControl.mockImplementationOnce(() => { throw new Error('Error en control'); });
      return mapa;
    });
    const mapa = iniciar();
    expect(mapa.remove).toHaveBeenCalledOnce();
    expect(mapa.off).toHaveBeenCalledTimes(3);
    expect(fixture.componentInstance.error()).toContain('No se pudo iniciar');
    fixture.destroy();
    expect(mapa.remove).toHaveBeenCalledOnce();
  });

  it('informa fallos al actualizar el estilo o la cámara sin crear otra instancia', () => {
    const mapa = iniciar();
    mapa.setStyle.mockImplementationOnce(() => { throw new Error('Estilo inválido'); });
    fixture.componentRef.setInput('estilo', '/invalido.json');
    fixture.detectChanges();
    expect(fixture.componentInstance.error()).toContain('No se pudo actualizar');
    mapa.jumpTo.mockImplementationOnce(() => { throw new Error('Cámara inválida'); });
    fixture.componentRef.setInput('zoom', NaN);
    fixture.detectChanges();
    expect(fixture.componentInstance.error()).toContain('No se pudo actualizar');
    expect(dobles.crearMapa).toHaveBeenCalledOnce();
  });

  it('informa fallos durante un resize explícito', () => {
    const mapa = iniciar();
    mapa.resize.mockImplementationOnce(() => { throw new Error('Error de tamaño'); });
    fixture.componentInstance.redimensionar();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se pudo ajustar el tamaño');
  });

  it('mantiene instancias y contenedores independientes y configura el worker solo una vez', () => {
    const primero = iniciar();
    const segundoFixture = TestBed.createComponent(Mapa);
    segundoFixture.detectChanges();
    const segundo = dobles.crearMapa.mock.results.at(-1)!.value;
    expect(primero).not.toBe(segundo);
    const opcionesPrimero = dobles.crearMapa.mock.calls[0][0] as { container: HTMLElement };
    const opcionesSegundo = dobles.crearMapa.mock.calls[1][0] as { container: HTMLElement };
    expect(opcionesPrimero.container).not.toBe(opcionesSegundo.container);
    expect(dobles.setWorkerUrl).toHaveBeenCalledOnce();
    fixture.destroy();
    expect(primero.remove).toHaveBeenCalledOnce();
    expect(segundo.remove).not.toHaveBeenCalled();
    segundoFixture.destroy();
    expect(segundo.remove).toHaveBeenCalledOnce();
  });
});
