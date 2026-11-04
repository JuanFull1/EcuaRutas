import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NavigationEnd, Routes, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom, filter, take } from 'rxjs';
import { appConfig } from '../app.config';
import { routes } from '../app.routes';
import { Login } from '../auth/login/login';
import { CLIENTE_ROUTES } from '../cliente/cliente.routes';
import { authGuard } from '../guards/auth.guard';
import { roleGuard } from '../guards/role.guard';
import { RolUsuario, Usuario } from '../models/usuario.model';
import { API_URL } from '../services/api.config';
import { AUTH_SESSION_KEY, AuthService } from '../services/auth.service';
import { Layout } from '../shared/layout/layout';
import { VENTAS_ROUTES } from '../ventas/ventas.routes';
import { VIAJES_ROUTES } from '../viajes/viajes.routes';
import { FrecuenciaFormulario } from './frecuencias/frecuencia-formulario';
import { FrecuenciaDto } from './frecuencias/frecuencia.model';
import { FrecuenciasLista } from './frecuencias/frecuencias-lista';
import { ResolucionAntFormulario } from './resoluciones-ant/resolucion-ant-formulario';
import { ResolucionAntDto } from './resoluciones-ant/resolucion-ant.model';
import { ResolucionesAntLista } from './resoluciones-ant/resoluciones-ant-lista';
import { TarifaFrecuenciaFormulario } from './tarifas-frecuencia/tarifa-frecuencia-formulario';
import { TarifaFrecuenciaDto } from './tarifas-frecuencia/tarifa-frecuencia.model';
import { TarifasFrecuenciaLista } from './tarifas-frecuencia/tarifas-frecuencia-lista';

const pantallas = [
  { path: 'resoluciones-ant', titulo: 'Gestión de resoluciones ANT', componente: ResolucionesAntLista, texto: 'Resoluciones ANT' },
  { path: 'frecuencias', titulo: 'Gestión de frecuencias', componente: FrecuenciasLista, texto: 'Frecuencias' },
  { path: 'tarifas', titulo: 'Gestión de tarifas', componente: TarifasFrecuenciaLista, texto: 'Tarifas' }
] as const;

describe('Rutas del PR 7', () => {
  it.each(pantallas)('registra una sola ruta diferida COOPERATIVA para $path', async pantalla => {
    const cooperativa = routes.find(r => r.path === 'cooperativas')!;
    expect(cooperativa.canActivate).toEqual([authGuard, roleGuard]); expect(cooperativa.data?.['roles']).toEqual(['COOPERATIVA']);
    const coincidencias = cooperativa.children!.filter(r => r.path === pantalla.path); expect(coincidencias).toHaveLength(1);
    const ruta = coincidencias[0]; expect(ruta.component).toBeUndefined(); expect(ruta.canActivate).toEqual([authGuard, roleGuard]);
    expect(ruta.data?.['roles']).toEqual(['COOPERATIVA']); expect(await ruta.loadComponent!()).toBe(pantalla.componente);
  });
  it('conserva rutas, orden y redirecciones previas sin rutas hermanas duplicadas', () => {
    expect(routes.map(r => r.path)).toEqual(['login', 'admin', 'cooperativas', 'viajes', 'ventas', 'cliente', 'personal-bus', '', '**']);
    const comprobar = (configuracion: Routes): void => {
      const paths = configuracion.map(r => r.path); expect(new Set(paths).size).toBe(paths.length);
      for (const ruta of configuracion) if (ruta.children) comprobar(ruta.children);
    };
    for (const configuracion of [routes, VIAJES_ROUTES, VENTAS_ROUTES, CLIENTE_ROUTES]) comprobar(configuracion);
    expect(routes.find(r => r.path === 'admin')!.children!.map(r => r.path))
      .toEqual(['inicio', 'cooperativas', 'usuarios', 'roles', '']);
    expect(routes.find(r => r.path === 'cooperativas')!.children!.map(r => r.path)).toEqual([
      'inicio', 'lugares', 'rutas', 'paradas', 'mapas/lugares', 'mapas/rutas', 'resoluciones-ant', 'frecuencias', 'tarifas',
      'configuracion', 'buses/nuevo', 'buses/:id/editar', 'buses', 'grupos', 'plantillas', ''
    ]);
    expect(routes.find(r => r.path === '')?.redirectTo).toBe('login'); expect(routes.find(r => r.path === '**')?.redirectTo).toBe('login');
  });
});

// Navegación real de Angular: router, guards, AuthService, layout y JWT del
// proyecto. HttpTestingController simula la API, sin credenciales ni DB reales.
describe('Integración de los módulos operativos', () => {
  const resolucion: ResolucionAntDto = { id: 3, cooperativaId: 4, numeroResolucion: 'ANT-01', fechaResolucion: '2026-11-04', archivoUrl: null, activa: true };
  const frecuencia: FrecuenciaDto = { id: 11, cooperativaId: 4, rutaId: 22, resolucionAntId: 3, codigo: null, horaSalida: '00:00:00', activa: true };
  const tarifa: TarifaFrecuenciaDto = { id: 7, frecuenciaId: 11, origenRutaParadaId: 90, destinoRutaParadaId: 10, precioBase: 5.25, activa: true };
  let http: HttpTestingController; let auth: AuthService; let router: Router; let harness: RouterTestingHarness;
  let resoluciones: ResolucionAntDto[]; let frecuencias: FrecuenciaDto[]; let tarifas: TarifaFrecuenciaDto[];

  beforeEach(async () => {
    localStorage.removeItem(AUTH_SESSION_KEY);
    resoluciones = [resolucion, { ...resolucion, id: 9, cooperativaId: 5, numeroResolucion: 'ANT-B' }]; frecuencias = [frecuencia]; tarifas = [tarifa];
    TestBed.configureTestingModule({ providers: [...appConfig.providers, provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController); auth = TestBed.inject(AuthService); router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => {
    try { http.verify(); }
    finally { localStorage.removeItem(AUTH_SESSION_KEY); TestBed.resetTestingModule(); }
  });
  function sesion(rol: RolUsuario = 'COOPERATIVA', vigente = true): void {
    const usuario: Usuario = { id: 1, nombres: 'Prueba', apellidos: 'Navegación', correo: 'prueba@example.invalid', rol, cooperativaId: rol === 'COOPERATIVA' ? 4 : null };
    auth.login(usuario.correo, 'solo-prueba-simulada').subscribe();
    http.expectOne(`${API_URL}/auth/login`).flush({ token: `jwt-simulado-${rol}`, expiraEn: new Date(Date.now() + (vigente ? 3600000 : -3600000)).toISOString(), usuario });
  }
  function comprobarJwt(cabecera: string | null): void { expect(cabecera).toBe(`Bearer ${auth.obtenerToken()}`); }
  function lecturas(sinCatalogos = false): void {
    harness.detectChanges();
    // Algunas respuestas disparan nuevas consultas, como frecuencia -> paradas.
    for (let ronda = 0; ronda < 8; ronda++) {
      const pendientes = http.match(r => r.method === 'GET'); if (!pendientes.length) break;
      for (const peticion of pendientes) {
        comprobarJwt(peticion.request.headers.get('Authorization')); const url = peticion.request.url;
        if (sinCatalogos && (url === `${API_URL}/rutas` || /\/rutas\/\d+\/paradas$/.test(url))) {
          peticion.flush({}, { status: 404, statusText: 'Not Found' }); continue;
        }
        if (url === `${API_URL}/usuarios/cooperativas`) peticion.flush([{ id: 4, nombre: 'Cooperativa A' }, { id: 5, nombre: 'Cooperativa B' }]);
        else if (url === `${API_URL}/rutas`) peticion.flush([{ id: 22, nombre: 'Quito – Cuenca', origenLugarId: 1090, destinoLugarId: 1010, tipoViaje: 'CON_PARADAS', activa: true }]);
        else if (url === `${API_URL}/lugares`) peticion.flush([{ id: 1090, nombre: 'Quito', tipo: 'CIUDAD', activo: true }, { id: 1010, nombre: 'Cuenca', tipo: 'CIUDAD', activo: true }]);
        else if (url === `${API_URL}/resoluciones-ant`) peticion.flush(resoluciones);
        else if (/\/resoluciones-ant\/\d+$/.test(url)) peticion.flush(resoluciones.find(r => r.id === Number(url.split('/').pop()))!);
        else if (url === `${API_URL}/frecuencias`) peticion.flush(frecuencias);
        else if (/\/frecuencias\/\d+$/.test(url)) peticion.flush(frecuencias.find(f => f.id === Number(url.split('/').pop()))!);
        else if (url === `${API_URL}/rutas/22/paradas`) peticion.flush([
          { id: 10, rutaId: 22, lugarId: 1010, orden: 2, kmAcumulado: null, minutosAcumulados: null, permiteAscenso: true, permiteDescenso: true },
          { id: 80, rutaId: 22, lugarId: 1080, orden: 1, kmAcumulado: null, minutosAcumulados: null, permiteAscenso: true, permiteDescenso: true },
          { id: 90, rutaId: 22, lugarId: 1090, orden: 0, kmAcumulado: null, minutosAcumulados: null, permiteAscenso: true, permiteDescenso: true }
        ]);
        else if (url === `${API_URL}/frecuencias/11/tarifas`) peticion.flush(tarifas);
        else if (/\/frecuencias\/11\/tarifas\/\d+$/.test(url)) peticion.flush(tarifas.find(t => t.id === Number(url.split('/').pop()))!);
        else if (url === `${API_URL}/buses` || url === `${API_URL}/plantillas`) {
          expect(peticion.request.params.get('cooperativaId')).toBe('4'); peticion.flush([]);
        } else throw new Error(`GET no previsto: ${peticion.request.urlWithParams}`);
      }
    }
    harness.detectChanges();
  }
  function menu(): HTMLElement { return harness.routeNativeElement!.querySelector('aside nav')!; }
  function componente<T>(tipo: new (...args: never[]) => T): T { return harness.routeDebugElement!.query(By.directive(tipo)).componentInstance as T; }
  function modal(): HTMLDialogElement {
    const dialogo = harness.routeNativeElement!.querySelector('dialog')!; dialogo.showModal = vi.fn(); dialogo.close = vi.fn(); return dialogo;
  }
  async function abrir(path: string): Promise<void> { await harness.navigateByUrl(`/cooperativas/${path}`, Layout); lecturas(); }
  async function enlace(path: string): Promise<void> {
    const fin = firstValueFrom(router.events.pipe(filter(e => e instanceof NavigationEnd), take(1)));
    menu().querySelector<HTMLAnchorElement>(`a[href="${path}"]`)!.click(); await fin; lecturas();
  }

  for (const rol of ['ADMIN', 'COOPERATIVA'] as const) {
    it.each(pantallas)(`${rol} no abre $path desde la antigua ruta ADMIN`, async pantalla => {
      sesion(rol);
      await harness.navigateByUrl(`/admin/${pantalla.path}`);
      expect(router.url).toBe('/login');
      expect(harness.routeDebugElement!.query(By.directive(pantalla.componente))).toBeNull();
      http.expectNone(request => request.method === 'GET');
    });
  }

  it.each(pantallas)('COOPERATIVA accede por URL a $path con un solo layout y enlace activo', async pantalla => {
    sesion(); await abrir(pantalla.path);
    expect(harness.routeDebugElement!.query(By.directive(pantalla.componente))).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toContain(pantalla.titulo);
    expect(harness.routeNativeElement!.querySelectorAll('aside')).toHaveLength(1); expect(harness.routeNativeElement!.querySelectorAll('header.navbar')).toHaveLength(1);
    expect(menu().querySelector(`a[href="/cooperativas/${pantalla.path}"]`)!.classList.contains('active')).toBe(true);
  });
  it.each(pantallas)('anónimo no puede abrir $path', async pantalla => {
    await harness.navigateByUrl(`/cooperativas/${pantalla.path}`, Login); expect(router.url).toBe('/login'); http.expectNone(r => r.method === 'GET');
  });
  for (const rol of ['ADMIN', 'OFICINISTA', 'CLIENTE', 'BUS'] as const) {
    it.each(pantallas)(`${rol} no accede por URL a $path ni ve enlaces administrativos`, async pantalla => {
      sesion(rol); await harness.navigateByUrl(`/cooperativas/${pantalla.path}`, Layout); lecturas();
      expect(router.url).toBe(auth.obtenerRutaInicio(rol)); expect(harness.routeDebugElement!.query(By.directive(pantalla.componente))).toBeNull();
      expect(menu().querySelector('a[href^="/cooperativas/"]')).toBeNull();
    });
  }
  it.each(pantallas)('revalida sesión expirada al navegar entre hijos de admin hacia $path', async pantalla => {
    sesion(); await abrir('inicio'); sesion('COOPERATIVA', false);
    await harness.navigateByUrl(`/cooperativas/${pantalla.path}`, Login); expect(router.url).toBe('/login'); http.expectNone(r => r.method === 'GET');
  });
  it.each(pantallas)('revalida cambio de rol dentro del mismo layout para $path', async pantalla => {
    sesion(); await abrir('inicio'); sesion('CLIENTE');
    await harness.navigateByUrl(`/cooperativas/${pantalla.path}`, Layout); expect(router.url).toBe('/cliente/inicio'); http.expectNone(r => r.method === 'GET');
  });
  it('COOPERATIVA conserva las opciones previas y recibe ocho enlaces unicos', async () => {
    sesion(); const layout = await harness.navigateByUrl('/cooperativas/inicio', Layout); lecturas();
    expect(layout.menuItems().map(item => item.texto)).toEqual([
      'Inicio', 'Lugares', 'Rutas', 'Paradas', 'Mapa de lugares', 'Mapa de rutas y paradas',
      'Resoluciones ANT', 'Frecuencias', 'Tarifas', 'Mi cooperativa', 'Buses', 'Grupos', 'Plantillas', 'Hojas de Ruta', 'Viajes'
    ]);
    for (const pantalla of pantallas) {
      const enlaces = menu().querySelectorAll(`a[href="/cooperativas/${pantalla.path}"]`); expect(enlaces).toHaveLength(1);
      expect(enlaces[0].querySelector('i.bi')).toBeTruthy(); expect(enlaces[0].textContent).toContain(pantalla.texto);
    }
    const hrefs = Array.from(menu().querySelectorAll('a')).map(a => a.getAttribute('href')); expect(new Set(hrefs).size).toBe(hrefs.length);
  });
  it('navega por sidebar entre las tres pantallas y preserva apertura, overlay y cierre móvil', async () => {
    sesion(); const layout = await harness.navigateByUrl('/cooperativas/inicio', Layout); lecturas();
    const boton = harness.routeNativeElement!.querySelector<HTMLButtonElement>('button[aria-label="Abrir menú"]')!;
    boton.click(); harness.detectChanges(); expect(layout.menuAbierto()).toBe(true);
    (harness.routeNativeElement!.querySelector('.sidebar-overlay') as HTMLElement).click(); harness.detectChanges(); expect(layout.menuAbierto()).toBe(false);
    for (const pantalla of pantallas) {
      boton.click(); harness.detectChanges(); await enlace(`/cooperativas/${pantalla.path}`); expect(layout.menuAbierto()).toBe(false);
      expect(router.url).toBe(`/cooperativas/${pantalla.path}`); expect(menu().querySelectorAll('a.active')).toHaveLength(1);
    }
    await enlace('/cooperativas/inicio'); expect(harness.routeNativeElement!.textContent).toContain('Panel de Cooperativa');
  });
  it('integra registro, consulta, edición inactiva y baja de resoluciones con JWT', async () => {
    sesion(); await abrir('resoluciones-ant'); const lista = componente(ResolucionesAntLista);
    lista.nueva(); harness.detectChanges(); const formulario = componente(ResolucionAntFormulario);
    formulario.form.patchValue({ cooperativaId: 4, numeroResolucion: ' ANT nueva ', fechaResolucion: null, archivoUrl: null }); formulario.guardar();
    const alta = http.expectOne(`${API_URL}/resoluciones-ant`); expect(alta.request.method).toBe('POST'); comprobarJwt(alta.request.headers.get('Authorization'));
    expect(alta.request.body).toEqual({ cooperativaId: 4, numeroResolucion: ' ANT nueva ', fechaResolucion: null, archivoUrl: null });
    const creada = { ...resolucion, id: 4, numeroResolucion: ' ANT nueva ', fechaResolucion: null }; resoluciones.push(creada);
    alta.flush(creada, { status: 201, statusText: 'Created' }); lecturas(); expect(lista.exito()).toContain('registrada');
    lista.abrir(creada, 'consultar'); lecturas(); expect(lista.detalleVisible()).toBe(true); lista.cerrarPanel(); harness.detectChanges();
    // Otra operación ya la dio de baja: se preserva el estado del GET actual.
    resoluciones = resoluciones.map(r => r.id === creada.id ? { ...r, activa: false } : r);
    lista.abrir(creada, 'editar'); lecturas(); const editar = componente(ResolucionAntFormulario); editar.form.controls.archivoUrl.setValue(''); editar.guardar();
    const put = http.expectOne(`${API_URL}/resoluciones-ant/4`); expect(put.request.method).toBe('PUT'); comprobarJwt(put.request.headers.get('Authorization'));
    expect(put.request.body.activa).toBe(false); expect(put.request.body.fechaResolucion).toBeNull(); expect(put.request.body.archivoUrl).toBe('');
    resoluciones = resoluciones.map(r => r.id === 4 ? { ...r, archivoUrl: '' } : r); put.flush(resoluciones.find(r => r.id === 4)!); lecturas();
    modal(); lista.solicitarBaja(resolucion); lista.confirmarBaja(); const baja = http.expectOne(`${API_URL}/resoluciones-ant/3`);
    expect(baja.request.method).toBe('DELETE'); comprobarJwt(baja.request.headers.get('Authorization'));
    resoluciones = resoluciones.map(r => r.id === 3 ? { ...r, activa: false } : r); baja.flush(null, { status: 204, statusText: 'No Content' }); lecturas();
    expect(lista.resoluciones().find(r => r.id === 3)?.activa).toBe(false);
  });
  it('integra frecuencia a medianoche, filtro de resoluciones, edición y baja', async () => {
    sesion(); await abrir('frecuencias'); const lista = componente(FrecuenciasLista); lista.nueva(); harness.detectChanges(); const formulario = componente(FrecuenciaFormulario);
    formulario.form.patchValue({ cooperativaId: 4, rutaId: 22, resolucionAntId: 9, horaSalida: '00:00' });
    expect(formulario.form.invalid).toBe(true); formulario.guardar(); http.expectNone(r => r.method === 'POST');
    expect(formulario.resolucionesDisponibles().map(r => r.id)).toEqual([3]); formulario.form.controls.resolucionAntId.setValue(3); formulario.guardar();
    const alta = http.expectOne(`${API_URL}/frecuencias`); comprobarJwt(alta.request.headers.get('Authorization')); expect(alta.request.body).toEqual({ cooperativaId: 4, rutaId: 22, resolucionAntId: 3, codigo: null, horaSalida: '00:00:00' });
    const creada = { ...frecuencia, id: 12 }; frecuencias.push(creada); alta.flush(creada, { status: 201, statusText: 'Created' }); lecturas();
    frecuencias = frecuencias.map(f => f.id === 12 ? { ...f, activa: false } : f); lista.abrir(creada, 'editar'); lecturas();
    const editar = componente(FrecuenciaFormulario); expect(editar.form.controls.horaSalida.value).toBe('00:00'); editar.form.controls.codigo.setValue(''); editar.guardar();
    const put = http.expectOne(`${API_URL}/frecuencias/12`); expect(put.request.method).toBe('PUT'); comprobarJwt(put.request.headers.get('Authorization'));
    expect(put.request.body.activa).toBe(false); expect(put.request.body.horaSalida).toBe('00:00:00'); expect(put.request.body.codigo).toBe('');
    frecuencias = frecuencias.map(f => f.id === 12 ? { ...f, codigo: '' } : f); put.flush(frecuencias.find(f => f.id === 12)!); lecturas();
    modal(); lista.solicitarBaja(frecuencia); lista.confirmarBaja(); const baja = http.expectOne(`${API_URL}/frecuencias/11`); expect(baja.request.method).toBe('DELETE'); comprobarJwt(baja.request.headers.get('Authorization'));
    frecuencias = frecuencias.map(f => f.id === 11 ? { ...f, activa: false } : f); baja.flush(null, { status: 204, statusText: 'No Content' }); lecturas();
    expect(lista.frecuencias().find(f => f.id === 11)?.activa).toBe(false);
  });
  it('integra tarifa con RutaParadaId, orden, precio cero, edición decimal y baja', async () => {
    sesion(); await abrir('tarifas'); const lista = componente(TarifasFrecuenciaLista); lista.seleccionarFrecuencia(11); lecturas();
    expect(lista.contexto()?.rutaId).toBe(22); expect(lista.paradasOrdenadas().map(p => p.id)).toEqual([90, 80, 10]);
    lista.nueva(); harness.detectChanges(); const formulario = componente(TarifaFrecuenciaFormulario);
    formulario.form.patchValue({ origenRutaParadaId: 80, destinoRutaParadaId: 10, precioBase: '0' }); formulario.guardar();
    const alta = http.expectOne(`${API_URL}/frecuencias/11/tarifas`); comprobarJwt(alta.request.headers.get('Authorization'));
    expect(alta.request.body).toEqual({ origenRutaParadaId: 80, destinoRutaParadaId: 10, precioBase: 0 });
    const creada = { ...tarifa, id: 8, origenRutaParadaId: 80, precioBase: 0 }; tarifas.push(creada); alta.flush(creada, { status: 201, statusText: 'Created' }); lecturas();
    tarifas = tarifas.map(t => t.id === 8 ? { ...t, activa: false } : t); lista.abrir(creada, 'editar'); lecturas();
    const editar = componente(TarifaFrecuenciaFormulario); editar.form.controls.precioBase.setValue('12,34'); editar.guardar();
    const put = http.expectOne(`${API_URL}/frecuencias/11/tarifas/8`); expect(put.request.method).toBe('PUT'); comprobarJwt(put.request.headers.get('Authorization'));
    expect(put.request.body).toEqual({ origenRutaParadaId: 80, destinoRutaParadaId: 10, precioBase: 12.34, activa: false });
    tarifas = tarifas.map(t => t.id === 8 ? { ...t, precioBase: 12.34 } : t); put.flush(tarifas.find(t => t.id === 8)!); lecturas();
    modal(); lista.solicitarBaja(tarifa); lista.confirmarBaja(); const baja = http.expectOne(`${API_URL}/frecuencias/11/tarifas/7`);
    expect(baja.request.method).toBe('DELETE'); comprobarJwt(baja.request.headers.get('Authorization'));
    tarifas = tarifas.map(t => t.id === 7 ? { ...t, activa: false } : t); baja.flush(null, { status: 204, statusText: 'No Content' }); lecturas();
    expect(lista.tarifas().find(t => t.id === 7)?.activa).toBe(false);
  });
  it('presenta conflictos operativos del backend sin abandonar el formulario integrado', async () => {
    sesion(); await abrir('frecuencias'); const lista = componente(FrecuenciasLista); lista.abrir(frecuencia, 'editar'); lecturas();
    const formulario = componente(FrecuenciaFormulario); formulario.form.controls.horaSalida.setValue('01:00'); formulario.guardar();
    http.expectOne(`${API_URL}/frecuencias/11`).flush({ mensaje: 'La frecuencia está referenciada por viajes, hojas de ruta o tarifas.' }, { status: 409, statusText: 'Conflict' });
    harness.detectChanges(); expect(lista.formularioVisible()).toBe(true); expect(harness.routeNativeElement!.textContent).toContain('referenciada');
  });
  it('maneja la dependencia real de rutas y paradas pendientes sin inventar datos', async () => {
    sesion(); await harness.navigateByUrl('/cooperativas/frecuencias', Layout); lecturas(true); const frecuenciasLista = componente(FrecuenciasLista);
    expect(frecuenciasLista.frecuencias()).toHaveLength(1); expect(frecuenciasLista.erroresCatalogos()).toHaveLength(1);
    await harness.navigateByUrl('/cooperativas/tarifas', Layout); lecturas(true); const lista = componente(TarifasFrecuenciaLista); lista.seleccionarFrecuencia(11); lecturas(true);
    expect(lista.tarifas()).toHaveLength(1); expect(lista.puedeCrear()).toBe(false); expect(lista.tramoDisponible()).toBe(false);
    expect(harness.routeNativeElement!.textContent).toContain('No se pueden registrar ni editar');
  });
});
