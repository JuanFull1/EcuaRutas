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

describe('Registro de rutas administrativas', () => {
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
    const admin = routes.find(ruta => ruta.path === 'admin')!;
    const coincidencias = admin.children!.filter(ruta => ruta.path === pantalla.path);
    expect(coincidencias).toHaveLength(1);
    expect(coincidencias[0].component).toBeUndefined();
    expect(await coincidencias[0].loadComponent!()).toBe(pantalla.componente);
  });
});

describe('Integración de navegación administrativa', () => {
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
    http.verify();
    localStorage.removeItem(AUTH_SESSION_KEY);
  });

  function iniciarSesion(rol: RolUsuario = 'ADMIN', vigente = true): void {
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

  it.each(pantallas)('ADMIN puede abrir directamente $path bajo un único layout', async pantalla => {
    iniciarSesion();
    await harness.navigateByUrl(`/admin/${pantalla.path}`, Layout);
    responderCatalogos();
    expect(harness.routeDebugElement!.query(By.directive(pantalla.componente))).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toContain(pantalla.titulo);
    expect(harness.routeNativeElement!.querySelectorAll('aside')).toHaveLength(1);
    expect(harness.routeNativeElement!.querySelectorAll('header.navbar')).toHaveLength(1);
    expect(menu().querySelector(`a[href="/admin/${pantalla.path}"]`)!.classList.contains('active')).toBe(true);
  });

  it.each(pantallas)('redirige a login si se abre $path sin una sesión', async pantalla => {
    await harness.navigateByUrl(`/admin/${pantalla.path}`, Login);
    expect(router.url).toBe('/login');
    expect(harness.routeNativeElement!.querySelector('aside')).toBeNull();
    http.expectNone(request => request.method === 'GET');
  });

  for (const rol of ['COOPERATIVA', 'OFICINISTA', 'CLIENTE', 'BUS'] as const) {
    it.each(pantallas)(`${rol} no puede entrar a $path y conserva su inicio`, async pantalla => {
      iniciarSesion(rol);
      await harness.navigateByUrl(`/admin/${pantalla.path}`, Layout);
      expect(router.url).toBe(auth.obtenerRutaInicio(rol));
      expect(menu().querySelector('a[href^="/admin/"]')).toBeNull();
      expect(harness.routeDebugElement!.query(By.directive(pantalla.componente))).toBeNull();
      http.expectNone(request => request.method === 'GET');
    });
  }

  it.each(pantallas)('comprueba de nuevo la sesión al navegar desde inicio a $path', async pantalla => {
    iniciarSesion();
    await harness.navigateByUrl('/admin/inicio', Layout);
    iniciarSesion('ADMIN', false);
    await harness.navigateByUrl(`/admin/${pantalla.path}`, Login);
    expect(router.url).toBe('/login');
    http.expectNone(request => request.method === 'GET');
  });

  it.each(pantallas)('comprueba de nuevo el rol al navegar dentro de admin a $path', async pantalla => {
    iniciarSesion();
    await harness.navigateByUrl('/admin/inicio', Layout);
    iniciarSesion('CLIENTE');
    await harness.navigateByUrl(`/admin/${pantalla.path}`, Layout);
    expect(router.url).toBe('/cliente/inicio');
    http.expectNone(request => request.method === 'GET');
  });

  it('navega entre las tres pantallas y regresa al panel usando el menú existente', async () => {
    iniciarSesion();
    await harness.navigateByUrl('/admin/inicio', Layout);
    for (const pantalla of pantallas) {
      await pulsarEnlace(`/admin/${pantalla.path}`);
      responderCatalogos();
      expect(router.url).toBe(`/admin/${pantalla.path}`);
      expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toContain(pantalla.titulo);
      const activos = menu().querySelectorAll('a.active');
      expect(activos).toHaveLength(1);
      expect(activos[0].getAttribute('href')).toBe(`/admin/${pantalla.path}`);
    }
    await pulsarEnlace('/admin/inicio');
    expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toContain('Panel principal');
  });

  it('mantiene el menú móvil, cierra con el overlay y al elegir una pantalla', async () => {
    iniciarSesion();
    const layout = await harness.navigateByUrl('/admin/inicio', Layout);
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
    await pulsarEnlace('/admin/lugares');
    responderCatalogos();
    expect(layout.menuAbierto()).toBe(false);
    expect(harness.routeNativeElement!.querySelector('.sidebar-overlay')).toBeNull();
  });

  it('añade una sola vez los enlaces e iconos y conserva las opciones previas de ADMIN', async () => {
    iniciarSesion();
    await harness.navigateByUrl('/admin/inicio', Layout);
    for (const path of ['lugares', 'rutas', 'paradas']) {
      const enlaces = menu().querySelectorAll(`a[href="/admin/${path}"]`);
      expect(enlaces).toHaveLength(1);
      expect(enlaces[0].querySelector('i.bi')).toBeTruthy();
    }
    for (const texto of ['Inicio', 'Usuarios', 'Cooperativas', 'Roles', 'Configuración']) {
      expect(menu().textContent).toContain(texto);
    }
  });

  it.each([
    { rol: 'COOPERATIVA', enlaces: ['/cooperativas/inicio', '/cooperativas/buses'], textos: ['Plantillas', 'Rutas', 'Frecuencias'] },
    { rol: 'OFICINISTA', enlaces: ['/ventas/inicio', '/ventas/disponibilidad', '/ventas/gestion'], textos: ['Pagos', 'Comprobantes', 'Validación de pagos'] },
    { rol: 'CLIENTE', enlaces: ['/cliente/inicio', '/cliente/buscar-viajes', '/cliente/boletos', '/cliente/historial', '/cliente/notificaciones'], textos: [] },
    { rol: 'BUS', enlaces: ['/personal-bus/inicio'], textos: ['Validar boletos', 'Viajes', 'Historial'] }
  ] as const)('conserva enlaces y opciones del menú de $rol', async ({ rol, enlaces, textos }) => {
    iniciarSesion(rol);
    await harness.navigateByUrl(auth.obtenerRutaInicio(rol), Layout);
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
  });

  it('integra el formulario de lugares con el layout, HttpClient y el interceptor existentes', async () => {
    iniciarSesion();
    await harness.navigateByUrl('/admin/lugares', Layout);
    responderCatalogos();
    const listado = harness.routeDebugElement!.query(By.directive(LugaresLista)).componentInstance as LugaresLista;
    listado.nuevo();
    harness.detectChanges();
    const formulario = harness.routeDebugElement!.query(By.directive(LugarFormulario)).componentInstance as LugarFormulario;
    formulario.form.patchValue({ nombre: 'Terminal de prueba', tipo: 'TERMINAL' });
    formulario.guardar();
    const peticion = http.expectOne(`${API_URL}/lugares`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-de-prueba-ADMIN');
    peticion.flush({ ...lugares[0], id: 33, nombre: 'Terminal de prueba', tipo: 'TERMINAL' }, { status: 201, statusText: 'Created' });
    responderCatalogos();
    expect(harness.routeNativeElement!.textContent).toContain('Lugar creado correctamente');
  });

  it('integra el formulario de rutas con los lugares reales simulados y el interceptor', async () => {
    iniciarSesion();
    await harness.navigateByUrl('/admin/rutas', Layout);
    responderCatalogos();
    const listado = harness.routeDebugElement!.query(By.directive(RutasLista)).componentInstance as RutasLista;
    listado.nueva();
    harness.detectChanges();
    const formulario = harness.routeDebugElement!.query(By.directive(RutaFormulario)).componentInstance as RutaFormulario;
    formulario.form.patchValue({ nombre: 'Ruta de prueba', origenLugarId: 11, destinoLugarId: 22, tipoViaje: 'CON_PARADAS' });
    formulario.guardar();
    const peticion = http.expectOne(`${API_URL}/rutas`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-de-prueba-ADMIN');
    peticion.flush({ ...rutas[0], id: 8, nombre: 'Ruta de prueba', tipoViaje: 'CON_PARADAS' });
    responderCatalogos();
    expect(harness.routeNativeElement!.textContent).toContain('Ruta creada correctamente');
  });

  it('integra selección y formulario de paradas bajo el layout con ambos IDs y JWT', async () => {
    iniciarSesion();
    await harness.navigateByUrl('/admin/paradas', Layout);
    responderCatalogos();
    const listado = harness.routeDebugElement!.query(By.directive(ParadasLista)).componentInstance as ParadasLista;
    listado.seleccionarRuta(7);
    const consulta = http.expectOne(`${API_URL}/rutas/7/paradas`);
    expect(consulta.request.headers.get('Authorization')).toBe('Bearer token-de-prueba-ADMIN');
    consulta.flush([]);
    listado.agregar();
    harness.detectChanges();
    const formulario = harness.routeDebugElement!.query(By.directive(ParadaFormulario)).componentInstance as ParadaFormulario;
    formulario.form.patchValue({ lugarId: 11, orden: 0 });
    formulario.guardar();
    const peticion = http.expectOne(`${API_URL}/rutas/7/paradas`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-de-prueba-ADMIN');
    const parada = { ...peticion.request.body, id: 101, rutaId: 7 };
    peticion.flush(parada);
    http.expectOne(`${API_URL}/rutas/7/paradas`).flush([parada]);
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Parada agregada correctamente');
    expect(listado.rutaId()).toBe(7);
  });
});
