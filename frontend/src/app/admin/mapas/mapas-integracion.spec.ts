import type { MapOptions } from 'maplibre-gl';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NavigationEnd, Router, Routes, convertToParamMap } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { appConfig } from '../../app.config';
import { routes } from '../../app.routes';
import { authGuard } from '../../guards/auth.guard';
import { roleGuard } from '../../guards/role.guard';
import { API_URL } from '../../services/api.config';
import { AUTH_SESSION_KEY, AuthService } from '../../services/auth.service';
import { Layout } from '../../shared/layout/layout';
import { ParadasLista } from '../paradas/paradas-lista';
import { LugaresMapa } from './lugares/lugares-mapa';
import { RutasMapa } from './rutas/rutas-mapa';
import { identificadorMapa } from './navegacion-mapa';
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

const lugares = [
  { id: 11, nombre: 'Quito', provincia: null, canton: null, tipo: 'CIUDAD', activo: true, ubicacion: { longitud: -78.46, latitud: -0.18 } },
  { id: 22, nombre: 'Cuenca', provincia: null, canton: null, tipo: 'TERMINAL', activo: false, ubicacion: { longitud: -79, latitud: -2.9 } },
  { id: 33, nombre: 'Sin ubicación', provincia: null, canton: null, tipo: 'PARADA', activo: true, ubicacion: null }
];
const rutas = [
  { id: 7, nombre: 'Quito – Cuenca', origenLugarId: 11, destinoLugarId: 22, tipoViaje: 'CON_PARADAS', activa: true },
  { id: 8, nombre: 'Regreso', origenLugarId: 22, destinoLugarId: 11, tipoViaje: 'DIRECTO', activa: false }
];
const paradas = [{ id: 101, rutaId: 7, lugarId: 11, orden: 0, kmAcumulado: 0, minutosAcumulados: null, permiteAscenso: false, permiteDescenso: true }];
const pantallas = [
  { path: 'mapas/lugares', componente: LugaresMapa },
  { path: 'mapas/rutas', componente: RutasMapa }
] as const;

describe('Registro de los mapas administrativos', () => {
  it.each(pantallas)('carga $path de forma diferida con ambos guards administrativos', async pantalla => {
    const cooperativa = routes.find(ruta => ruta.path === 'cooperativas')!;
    const ruta = cooperativa.children!.find(ruta => ruta.path === pantalla.path)!;
    expect(ruta.canActivate).toEqual([authGuard, roleGuard]);
    expect(ruta.data?.['roles']).toEqual(['COOPERATIVA']);
    expect(ruta.component).toBeUndefined();
    expect(await ruta.loadComponent!()).toBe(pantalla.componente);
  });

  it('conserva las rutas administrativas anteriores y evita duplicaciones', () => {
    const comprobar = (configuracion: Routes): void => {
      expect(new Set(configuracion.map(ruta => ruta.path)).size).toBe(configuracion.length);
      for (const ruta of configuracion) if (ruta.children) comprobar(ruta.children);
    };
    comprobar(routes);
    expect(routes.find(ruta => ruta.path === 'admin')!.children!.map(ruta => ruta.path))
      .toEqual(['inicio', 'cooperativas', 'usuarios', 'roles', '']);
  });

  it.each(['', '0', '-1', '1.5', '1e2', 'NaN', 'Infinity', '2147483648', ' 11', '11x'])('rechaza el identificador %s', valor => {
    expect(identificadorMapa(convertToParamMap({ lugarId: valor }), 'lugarId')).toBe('invalido');
  });
  it('distingue ausencias, int32 válidos y parámetros repetidos', () => {
    expect(identificadorMapa(convertToParamMap({}), 'rutaId')).toBeNull();
    expect(identificadorMapa(convertToParamMap({ rutaId: '2147483647' }), 'rutaId')).toBe(2147483647);
    expect(identificadorMapa(convertToParamMap({ rutaId: ['7', '8'] }), 'rutaId')).toBe('invalido');
  });
});

describe('Integración de mapas con la navegación de cooperativa', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let router: Router;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.removeItem(AUTH_SESSION_KEY);
    TestBed.configureTestingModule({ providers: [...appConfig.providers, provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => { http.verify(); localStorage.removeItem(AUTH_SESSION_KEY); });

  function iniciarSesion(rol: 'ADMIN' | 'CLIENTE' | 'COOPERATIVA' | 'OFICINISTA' | 'BUS' = 'COOPERATIVA', vigente = true): void {
    auth.login('mapas@example.test', 'prueba').subscribe();
    http.expectOne(`${API_URL}/auth/login`).flush({
      token: 'token-de-prueba', expiraEn: new Date(Date.now() + (vigente ? 3600000 : -3600000)).toISOString(),
      usuario: { id: 1, nombres: 'Prueba', apellidos: 'Mapas', correo: 'mapas@example.test', rol, cooperativaId: 5 }
    });
  }

  function responder(): void {
    for (let ronda = 0; ronda < 5; ronda++) {
      harness.detectChanges();
      TestBed.tick();
      for (const peticion of http.match(() => true)) {
        expect(peticion.request.method).toBe('GET');
        expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
        const url = peticion.request.url;
        if (url === `${API_URL}/lugares`) peticion.flush(lugares);
        else if (url === `${API_URL}/rutas`) peticion.flush(rutas);
        else if (url === `${API_URL}/rutas/7/paradas`) peticion.flush(paradas);
        else if (url === `${API_URL}/rutas/8/paradas`) peticion.flush([]);
        else if (url === `${API_URL}/buses` || url === `${API_URL}/plantillas`) peticion.flush([]);
        else throw new Error(`Consulta inesperada: ${url}`);
      }
    }
    harness.detectChanges();
  }
  const texto = () => harness.routeNativeElement!.textContent!;
  const lugarMapa = () => harness.routeDebugElement!.query(By.directive(LugaresMapa)).componentInstance as LugaresMapa;
  const rutaMapa = () => harness.routeDebugElement!.query(By.directive(RutasMapa)).componentInstance as RutasMapa;

  async function abrir(url: string): Promise<void> {
    await harness.navigateByUrl(url, Layout);
    responder();
  }
  async function pulsar(selector: string): Promise<void> {
    const enlace = harness.routeNativeElement!.querySelector<HTMLAnchorElement>(selector)!;
    expect(enlace).toBeTruthy();
    const fin = new Promise<void>(resolve => {
      const sub = router.events.subscribe(evento => { if (evento instanceof NavigationEnd) { sub.unsubscribe(); resolve(); } });
    });
    enlace.click();
    await fin;
    responder();
  }

  for (const rol of ['ADMIN', 'COOPERATIVA'] as const) {
    it.each(pantallas)(`${rol} no abre $path desde la antigua ruta ADMIN`, async pantalla => {
      iniciarSesion(rol);
      await harness.navigateByUrl(`/admin/${pantalla.path}`);
      expect(router.url).toBe('/login');
      expect(harness.routeDebugElement!.query(By.directive(pantalla.componente))).toBeNull();
      http.expectNone(request => request.method === 'GET');
    });
  }

  it.each(pantallas)('COOPERATIVA abre $path dentro del layout, con menú activo y regreso a gestión', async pantalla => {
    iniciarSesion();
    await abrir(`/cooperativas/${pantalla.path}`);
    expect(harness.routeDebugElement!.query(By.directive(pantalla.componente))).toBeTruthy();
    expect(harness.routeNativeElement!.querySelectorAll('aside')).toHaveLength(1);
    expect(harness.routeNativeElement!.querySelectorAll(`aside a[href="/cooperativas/${pantalla.path}"].active`)).toHaveLength(1);
    expect(harness.routeNativeElement!.querySelector('nav[aria-label="Volver a la gestión"] a')).toBeTruthy();
  });

  for (const rol of [null, 'CLIENTE', 'ADMIN', 'OFICINISTA', 'BUS'] as const) {
    it.each(pantallas)(`${rol ?? 'Sin sesión'} no puede acceder a $path`, async pantalla => {
      if (rol) iniciarSesion(rol);
      await harness.navigateByUrl(`/cooperativas/${pantalla.path}?rutaId=7`);
      expect(router.url).toBe(rol ? auth.obtenerRutaInicio(rol) : '/login');
      expect(harness.routeDebugElement!.query(By.directive(pantalla.componente))).toBeNull();
      expect(harness.routeNativeElement!.querySelector('a[href^="/cooperativas/mapas/"]')).toBeNull();
      http.expectNone(request => request.method === 'GET');
    });
  }

  it.each(pantallas)('vuelve a comprobar sesión y rol al abrir $path desde admin', async pantalla => {
    iniciarSesion();
    await abrir('/cooperativas/inicio');
    iniciarSesion('COOPERATIVA', false);
    await harness.navigateByUrl(`/cooperativas/${pantalla.path}`);
    expect(router.url).toBe('/login');
    iniciarSesion();
    await abrir('/cooperativas/inicio');
    iniciarSesion('CLIENTE');
    await harness.navigateByUrl(`/cooperativas/${pantalla.path}`);
    expect(router.url).toBe('/cliente/inicio');
    http.expectNone(request => request.method === 'GET');
  });

  it('abre ambos mapas desde el menú, conserva sus iconos y cierra el menú móvil', async () => {
    iniciarSesion();
    await abrir('/cooperativas/inicio');
    for (const pantalla of pantallas) {
      const layout = harness.routeDebugElement!.componentInstance as Layout;
      layout.toggleMenu(); harness.detectChanges();
      await pulsar(`aside a[href="/cooperativas/${pantalla.path}"]`);
      expect(layout.menuAbierto()).toBe(false);
      expect(harness.routeNativeElement!.querySelectorAll('aside a.active')).toHaveLength(1);
      expect(harness.routeNativeElement!.querySelector('aside a.active i.bi')).toBeTruthy();
    }
    await pulsar('nav[aria-label="Volver a la gestión"] a');
    expect(router.url).toBe('/cooperativas/rutas');
  });

  it('abre un lugar desde su listado, consulta el catálogo y centra sus coordenadas', async () => {
    iniciarSesion(); await abrir('/cooperativas/lugares');
    await pulsar('a[aria-label="Ver en mapa Quito"]');
    expect(router.url).toBe('/cooperativas/mapas/lugares?lugarId=11');
    expect(harness.routeNativeElement!.querySelector('aside a[href="/cooperativas/mapas/lugares"].active')).toBeTruthy();
    expect(lugarMapa().seleccionado()?.id).toBe(11);
    const real = dobles.crearMapa.mock.results.at(-1)!.value;
    real.emitir('load'); harness.detectChanges();
    expect(real.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [-78.46, -0.18] }));
  });

  it('conserva el mapa al cambiar de lugar e informa de coordenadas ausentes y registros inexistentes', async () => {
    iniciarSesion(); await abrir('/cooperativas/mapas/lugares?lugarId=11');
    const instancia = lugarMapa();
    await abrir('/cooperativas/mapas/lugares?lugarId=33');
    expect(lugarMapa()).toBe(instancia);
    expect(instancia.seleccionado()?.id).toBe(33);
    expect(instancia.coordenadasSeleccionadas()).toBeNull();
    expect(texto()).toContain('Sin coordenadas');
    await abrir('/cooperativas/mapas/lugares?lugarId=999');
    expect(instancia.seleccionado()).toBeNull();
    expect(texto()).toContain('no existe');
    expect(dobles.crearMapa).toHaveBeenCalledTimes(1);
  });

  it.each(['abc', '0', '-3', '11&lugarId=22'])('informa de lugarId inválido %s sin seleccionar otro registro', async valor => {
    iniciarSesion(); await abrir(`/cooperativas/mapas/lugares?lugarId=${valor}`);
    expect(lugarMapa().seleccionado()).toBeNull();
    expect(texto()).toContain('identificador del lugar no es válido');
  });

  it('abre una ruta desde su listado y ajusta la vista al recorrido', async () => {
    iniciarSesion(); await abrir('/cooperativas/rutas');
    await pulsar('a[aria-label="Ver en mapa Quito – Cuenca"]');
    expect(router.url).toBe('/cooperativas/mapas/rutas?rutaId=7');
    expect(rutaMapa().rutaId()).toBe(7);
    expect(harness.routeNativeElement!.querySelector<HTMLSelectElement>('#ruta-mapa-selector')!.value).toBe('7');
    expect(rutaMapa().recorrido()?.puntos.map(punto => punto.clave)).toEqual(['origen', 'parada:101', 'destino']);
    const real = dobles.crearMapa.mock.results.at(-1)!.value;
    real.emitir('load'); harness.detectChanges();
    expect(real.fitBounds).toHaveBeenCalled();
  });

  it('abre la ruta y una parada concreta desde gestión de paradas', async () => {
    iniciarSesion(); await abrir('/cooperativas/paradas');
    const listado = harness.routeDebugElement!.query(By.directive(ParadasLista)).componentInstance as ParadasLista;
    listado.seleccionarRuta(7); responder();
    expect(harness.routeNativeElement!.querySelector('a[href="/cooperativas/mapas/rutas?rutaId=7"]')).toBeTruthy();
    await pulsar('a[aria-label="Ver en mapa parada 0 de Quito"]');
    expect(router.url).toBe('/cooperativas/mapas/rutas?rutaId=7&paradaId=101');
    expect(harness.routeNativeElement!.querySelectorAll('aside a.active')).toHaveLength(1);
    expect(harness.routeNativeElement!.querySelector('aside a[href="/cooperativas/mapas/rutas"].active')).toBeTruthy();
    expect(rutaMapa().puntoSeleccionado()?.parada?.id).toBe(101);
  });

  it('actualiza parámetros sin recrear el mapa y maneja ruta inactiva sin paradas', async () => {
    iniciarSesion(); await abrir('/cooperativas/mapas/rutas?rutaId=7&paradaId=101');
    const instancia = rutaMapa();
    await abrir('/cooperativas/mapas/rutas?rutaId=8');
    expect(rutaMapa()).toBe(instancia);
    expect(instancia.rutaSeleccionada()?.activa).toBe(false);
    expect(harness.routeNativeElement!.querySelector<HTMLSelectElement>('#ruta-mapa-selector')!.value).toBe('8');
    expect(instancia.paradas()).toEqual([]);
    expect(instancia.puntoSeleccionado()).toBeNull();
    expect(instancia.recorrido()?.linea).not.toBeNull();
    expect(dobles.crearMapa).toHaveBeenCalledTimes(1);
  });

  it.each(['abc', '0', '999'])('informa de rutaId inválido o inexistente %s', async valor => {
    iniciarSesion(); await abrir(`/cooperativas/mapas/rutas?rutaId=${valor}`);
    expect(rutaMapa().rutaId()).toBeNull();
    expect(rutaMapa().avisoNavegacion()).toBeTruthy();
  });

  it.each(['abc', '999'])('no conserva una parada previa al recibir paradaId %s', async valor => {
    iniciarSesion(); await abrir('/cooperativas/mapas/rutas?rutaId=7&paradaId=101');
    await abrir(`/cooperativas/mapas/rutas?rutaId=7&paradaId=${valor}`);
    expect(rutaMapa().rutaId()).toBe(7);
    expect(rutaMapa().puntoSeleccionado()).toBeNull();
    expect(rutaMapa().avisoParada()).toBeTruthy();
  });

  it('rechaza una parada sin ruta y no consulta sus datos', async () => {
    iniciarSesion(); await abrir('/cooperativas/mapas/rutas?paradaId=101');
    expect(rutaMapa().rutaId()).toBeNull();
    expect(texto()).toContain('una parada requiere su ruta');
  });
});
