import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NavigationEnd, Router, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { appConfig } from '../app.config';
import { routes } from '../app.routes';
import { Login } from '../auth/login/login';
import { CLIENTE_ROUTES } from '../cliente/cliente.routes';
import { RolUsuario, Usuario } from '../models/usuario.model';
import { API_URL } from '../services/api.config';
import { AUTH_SESSION_KEY, AuthService } from '../services/auth.service';
import { Layout } from '../shared/layout/layout';
import { VENTAS_ROUTES } from '../ventas/ventas.routes';
import { LugarFormulario } from './lugares/lugar-formulario';
import { LugarDto } from './lugares/lugar.model';
import { LugaresLista } from './lugares/lugares-lista';
import { ParadaFormulario } from './paradas/parada-formulario';
import { ParadasLista } from './paradas/paradas-lista';
import { RutaFormulario } from './rutas/ruta-formulario';
import { RutaDto } from './rutas/ruta.model';
import { RutasLista } from './rutas/rutas-lista';

const pantallas = [
  { path: 'lugares', titulo: 'Gestión de lugares', componente: LugaresLista },
  { path: 'rutas', titulo: 'Gestión de rutas', componente: RutasLista },
  { path: 'paradas', titulo: 'Gestión de paradas', componente: ParadasLista }
] as const;

describe('Registro de rutas operativas', () => {
  it('no contiene rutas hermanas duplicadas, incluidos los módulos diferidos existentes', () => {
    const comprobar = (configuracion: Routes): void => {
      const paths = configuracion.map(ruta => ruta.path);
      expect(new Set(paths).size).toBe(paths.length);
      for (const ruta of configuracion) if (ruta.children) comprobar(ruta.children);
    };
    comprobar(routes);
    comprobar(CLIENTE_ROUTES);
    comprobar(VENTAS_ROUTES);
  });

  it.each(pantallas)('resuelve $path mediante carga diferida al componente existente', async pantalla => {
    const cooperativa = routes.find(ruta => ruta.path === 'cooperativas')!;
    const coincidencias = cooperativa.children!.filter(ruta => ruta.path === pantalla.path);
    expect(coincidencias).toHaveLength(1);
    expect(coincidencias[0].component).toBeUndefined();
    expect(await coincidencias[0].loadComponent!()).toBe(pantalla.componente);
  });
});

describe('Integración de navegación de cooperativa', () => {
  const lugares: LugarDto[] = [
    { id: 11, nombre: 'Quito', provincia: null, canton: null, tipo: 'CIUDAD', ubicacion: null, activo: true },
    { id: 22, nombre: 'Cuenca', provincia: null, canton: null, tipo: 'TERMINAL', ubicacion: null, activo: true }
  ];
  const rutas: RutaDto[] = [
    { id: 7, nombre: 'Quito – Cuenca', origenLugarId: 11, destinoLugarId: 22, tipoViaje: 'DIRECTO', activa: true }
  ];
  let http: HttpTestingController;
  let auth: AuthService;
  let router: Router;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    localStorage.removeItem(AUTH_SESSION_KEY);
    TestBed.configureTestingModule({
      // Utiliza el router, AuthService, guards y configuración de interceptores reales.
      providers: [...appConfig.providers, provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    try { http.verify(); }
    finally { localStorage.removeItem(AUTH_SESSION_KEY); TestBed.resetTestingModule(); }
  });

  function iniciarSesion(rol: RolUsuario = 'COOPERATIVA', vigente = true): void {
    const usuario: Usuario = {
      id: 1, nombres: 'Usuario', apellidos: 'Prueba', correo: 'prueba@example.test', rol, cooperativaId: 5
    };
    auth.login(usuario.correo, 'clave-de-prueba').subscribe();
    http.expectOne(`${API_URL}/auth/login`).flush({
      token: `token-de-prueba-${rol}`,
      expiraEn: new Date(Date.now() + (vigente ? 3600000 : -3600000)).toISOString(), usuario
    });
  }

  function responderCatalogos(): void {
    for (const peticion of http.match(request => request.method === 'GET')) {
      expect(peticion.request.headers.get('Authorization')).toBe(`Bearer ${auth.obtenerToken()}`);
      if (peticion.request.url === `${API_URL}/lugares`) peticion.flush(lugares);
      else if (peticion.request.url === `${API_URL}/rutas`) peticion.flush(rutas);
      else throw new Error(`Consulta inesperada: ${peticion.request.urlWithParams}`);
    }
    harness.detectChanges();
  }

  function responderInicioCooperativa(): void {
    // El inicio actual consulta sus indicadores; no son accesos a catálogos ADMIN.
    for (const recurso of ['buses', 'plantillas']) {
      const peticion = http.expectOne(`${API_URL}/${recurso}?cooperativaId=5`);
      expect(peticion.request.headers.get('Authorization')).toBe(`Bearer ${auth.obtenerToken()}`);
      peticion.flush([]);
    }
    harness.detectChanges();
  }

  function menu(): HTMLElement {
    return harness.routeNativeElement!.querySelector('aside nav')!;
  }

  async function pulsarEnlace(path: string): Promise<void> {
    const enlace = menu().querySelector<HTMLAnchorElement>(`a[href="${path}"]`)!;
    expect(enlace).toBeTruthy();
    const navegacion = new Promise<void>(resolve => {
      const suscripcion = router.events.subscribe(evento => {
        if (evento instanceof NavigationEnd) {
          suscripcion.unsubscribe();
          resolve();
        }
      });
    });
    enlace.click();
    await navegacion;
    harness.detectChanges();
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

  it.each(pantallas)('COOPERATIVA puede abrir directamente $path bajo un único layout', async pantalla => {
    iniciarSesion();
    await harness.navigateByUrl(`/cooperativas/${pantalla.path}`, Layout);
    responderCatalogos();
    expect(harness.routeDebugElement!.query(By.directive(pantalla.componente))).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toContain(pantalla.titulo);
    expect(harness.routeNativeElement!.querySelectorAll('aside')).toHaveLength(1);
    expect(harness.routeNativeElement!.querySelectorAll('header.navbar')).toHaveLength(1);
    expect(menu().querySelector(`a[href="/cooperativas/${pantalla.path}"]`)!.classList.contains('active')).toBe(true);
  });

  it.each(pantallas)('redirige a login si se abre $path sin una sesión', async pantalla => {
    await harness.navigateByUrl(`/cooperativas/${pantalla.path}`, Login);
    expect(router.url).toBe('/login');
    expect(harness.routeNativeElement!.querySelector('aside')).toBeNull();
    http.expectNone(request => request.method === 'GET');
  });

  for (const rol of ['ADMIN', 'OFICINISTA', 'CLIENTE', 'BUS'] as const) {
    it.each(pantallas)(`${rol} no puede entrar a $path y conserva su inicio`, async pantalla => {
      iniciarSesion(rol);
      await harness.navigateByUrl(`/cooperativas/${pantalla.path}`, Layout);
      expect(router.url).toBe(auth.obtenerRutaInicio(rol));
      expect(menu().querySelector(`a[href="/cooperativas/${pantalla.path}"]`)).toBeNull();
      expect(harness.routeDebugElement!.query(By.directive(pantalla.componente))).toBeNull();
      http.expectNone(request => request.method === 'GET');
    });
  }

  it.each(pantallas)('comprueba de nuevo la sesión al navegar desde inicio a $path', async pantalla => {
    iniciarSesion();
    await harness.navigateByUrl('/cooperativas/inicio', Layout);
    responderInicioCooperativa();
    iniciarSesion('COOPERATIVA', false);
    await harness.navigateByUrl(`/cooperativas/${pantalla.path}`, Login);
    expect(router.url).toBe('/login');
    http.expectNone(request => request.method === 'GET');
  });

  it.each(pantallas)('comprueba de nuevo el rol al navegar dentro de admin a $path', async pantalla => {
    iniciarSesion();
    await harness.navigateByUrl('/cooperativas/inicio', Layout);
    responderInicioCooperativa();
    iniciarSesion('CLIENTE');
    await harness.navigateByUrl(`/cooperativas/${pantalla.path}`, Layout);
    expect(router.url).toBe('/cliente/inicio');
    http.expectNone(request => request.method === 'GET');
  });

  it('navega entre las tres pantallas y regresa al panel usando el menú existente', async () => {
    iniciarSesion();
    await harness.navigateByUrl('/cooperativas/inicio', Layout);
    responderInicioCooperativa();
    for (const pantalla of pantallas) {
      await pulsarEnlace(`/cooperativas/${pantalla.path}`);
      responderCatalogos();
      expect(router.url).toBe(`/cooperativas/${pantalla.path}`);
      expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toContain(pantalla.titulo);
      const activos = menu().querySelectorAll('a.active');
      expect(activos).toHaveLength(1);
      expect(activos[0].getAttribute('href')).toBe(`/cooperativas/${pantalla.path}`);
    }
    await pulsarEnlace('/cooperativas/inicio');
    responderInicioCooperativa();
    expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toContain('Panel de Cooperativa');
  });

  it('mantiene el menú móvil, cierra con el overlay y al elegir una pantalla', async () => {
    iniciarSesion();
    const layout = await harness.navigateByUrl('/cooperativas/inicio', Layout);
    responderInicioCooperativa();
    const abrir = harness.routeNativeElement!.querySelector<HTMLButtonElement>('button[aria-label="Abrir menú"]')!;
    expect(abrir.classList.contains('d-lg-none')).toBe(true);
    abrir.click();
    harness.detectChanges();
    expect(layout.menuAbierto()).toBe(true);
    expect(harness.routeNativeElement!.querySelector('.sidebar-open')).toBeTruthy();
    (harness.routeNativeElement!.querySelector('.sidebar-overlay') as HTMLElement).click();
    harness.detectChanges();
    expect(layout.menuAbierto()).toBe(false);
    abrir.click();
    harness.detectChanges();
    await pulsarEnlace('/cooperativas/lugares');
    responderCatalogos();
    expect(layout.menuAbierto()).toBe(false);
    expect(harness.routeNativeElement!.querySelector('.sidebar-overlay')).toBeNull();
  });

  it('ADMIN conserva sus opciones globales y no muestra los ocho modulos trasladados', async () => {
    iniciarSesion('ADMIN');
    const layout = await harness.navigateByUrl('/admin/inicio', Layout);
    expect(layout.menuItems().map(item => item.texto)).toEqual(['Inicio', 'Usuarios', 'Cooperativas', 'Roles', 'Configuración']);
    expect(menu().querySelector('a[href^="/cooperativas/"]')).toBeNull();
    for (const path of ['inicio', 'usuarios', 'cooperativas', 'roles']) {
      expect(menu().querySelectorAll(`a[href="/admin/${path}"]`)).toHaveLength(1);
    }
  });

  it.each([
    { rol: 'COOPERATIVA', enlaces: ['/cooperativas/inicio', '/cooperativas/lugares', '/cooperativas/rutas', '/cooperativas/paradas', '/cooperativas/mapas/lugares', '/cooperativas/mapas/rutas', '/cooperativas/resoluciones-ant', '/cooperativas/frecuencias', '/cooperativas/tarifas', '/cooperativas/configuracion', '/cooperativas/buses', '/cooperativas/grupos', '/cooperativas/plantillas', '/viajes/hojas-ruta', '/viajes/lista'], textos: [] },
    { rol: 'OFICINISTA', enlaces: ['/ventas/inicio', '/ventas/disponibilidad', '/ventas/gestion'], textos: ['Pagos', 'Comprobantes', 'Validación de pagos'] },
    { rol: 'CLIENTE', enlaces: ['/cliente/inicio', '/cliente/buscar-viajes', '/cliente/boletos', '/cliente/historial', '/cliente/notificaciones'], textos: [] },
    { rol: 'BUS', enlaces: ['/personal-bus/inicio'], textos: ['Validar boletos', 'Viajes', 'Historial'] }
  ] as const)('conserva enlaces y opciones del menú de $rol', async ({ rol, enlaces, textos }) => {
    iniciarSesion(rol);
    await harness.navigateByUrl(auth.obtenerRutaInicio(rol), Layout);
    if (rol === 'COOPERATIVA') responderInicioCooperativa();
    const hrefs = Array.from(menu().querySelectorAll('a')).map(enlace => enlace.getAttribute('href'));
    expect(hrefs).toEqual(enlaces);
    for (const texto of textos) expect(menu().textContent).toContain(texto);
    expect(menu().querySelector('a[href^="/admin/"]')).toBeNull();
  });

  it.each(['/', '/ruta-inexistente'])('conserva la redirección de %s a login', async path => {
    await harness.navigateByUrl(path, Login);
    expect(router.url).toBe('/login');
  });

  it.each([
    { rol: 'ADMIN', path: '/admin', esperado: '/admin/inicio' },
    { rol: 'COOPERATIVA', path: '/cooperativas', esperado: '/cooperativas/inicio' },
    { rol: 'OFICINISTA', path: '/ventas', esperado: '/ventas/inicio' },
    { rol: 'CLIENTE', path: '/cliente', esperado: '/cliente/inicio' },
    { rol: 'BUS', path: '/personal-bus', esperado: '/personal-bus/inicio' }
  ] as const)('conserva la redirección de $path a su inicio', async ({ rol, path, esperado }) => {
    iniciarSesion(rol);
    await harness.navigateByUrl(path, Layout);
    expect(router.url).toBe(esperado);
    if (rol === 'COOPERATIVA') responderInicioCooperativa();
  });

  it.each(pantallas)('COOPERATIVA consulta $path sin habilitar escrituras globales', async pantalla => {
    iniciarSesion();
    await harness.navigateByUrl(`/cooperativas/${pantalla.path}`, Layout);
    responderCatalogos();
    const listado = harness.routeDebugElement!.query(By.directive(pantalla.componente)).componentInstance;
    expect(listado.puedeEscribir()).toBe(false);
    if (pantalla.path === 'lugares') listado.nuevo();
    else if (pantalla.path === 'rutas') listado.nueva();
    else {
      listado.seleccionarRuta(7);
      http.expectOne(`${API_URL}/rutas/7/paradas`).flush([]);
      listado.agregar();
    }
    harness.detectChanges();
    expect(harness.routeDebugElement!.query(By.directive(LugarFormulario))).toBeNull();
    expect(harness.routeDebugElement!.query(By.directive(RutaFormulario))).toBeNull();
    expect(harness.routeDebugElement!.query(By.directive(ParadaFormulario))).toBeNull();
    http.expectNone(request => request.method !== 'GET');
  });
});
