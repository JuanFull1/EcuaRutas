import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { API_URL } from '../../services/api.config';
import { AuthService } from '../../services/auth.service';
import { FrecuenciaFormulario } from './frecuencia-formulario';
import { FrecuenciaDto } from './frecuencia.model';
import { FrecuenciasLista } from './frecuencias-lista';

describe('FrecuenciasLista', () => {
  const url = `${API_URL}/frecuencias`;
  const coops = `${API_URL}/usuarios/cooperativas`;
  const rutas = `${API_URL}/rutas`;
  const resoluciones = `${API_URL}/resoluciones-ant`;
  const actual: FrecuenciaDto = { id: 7, cooperativaId: 4, rutaId: 2, resolucionAntId: 3, codigo: null, horaSalida: '00:00:00', activa: true };
  let http: HttpTestingController; let autorizado: boolean;
  beforeEach(() => {
    autorizado = true;
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { tieneRol: (rol: string) => autorizado && rol === 'ADMIN' } }] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  const completarCatalogos = () => {
    http.expectOne(coops).flush([{ id: 4, nombre: 'Cooperativa A' }, { id: 5, nombre: 'Cooperativa B' }]);
    http.expectOne(rutas).flush([{ id: 2, nombre: 'Quito – Cuenca', origenLugarId: 11, destinoLugarId: 22, tipoViaje: 'DIRECTO', activa: true }]);
    http.expectOne(resoluciones).flush([{ id: 3, cooperativaId: 4, numeroResolucion: 'ANT-01', fechaResolucion: null, archivoUrl: null, activa: true },
      { id: 30, cooperativaId: 5, numeroResolucion: 'ANT-B', fechaResolucion: null, archivoUrl: null, activa: true }]);
  };
  const completarCarga = (filas: FrecuenciaDto[] = [actual]) => { http.expectOne(url).flush(filas); completarCatalogos(); };
  const crear = (filas: FrecuenciaDto[] = [actual]) => {
    const fixture = TestBed.createComponent(FrecuenciasLista); fixture.detectChanges(); completarCarga(filas); fixture.detectChanges(); return fixture;
  };
  const dialogo = (elemento: HTMLElement) => { const d = elemento.querySelector('dialog')!; d.showModal = vi.fn(); d.close = vi.fn(); return d; };

  it('renderiza cooperativa, ruta, resolución, medianoche, código nulo e inactivas', () => {
    const fixture = crear([actual, { ...actual, id: 8, activa: false }]); const html = fixture.nativeElement as HTMLElement;
    for (const texto of ['Gestión de frecuencias', 'Cooperativa A', 'Quito – Cuenca', 'ANT-01', '00:00:00', 'Sin código', 'Inactiva']) expect(html.textContent).toContain(texto);
    expect(html.querySelectorAll('tbody tr')).toHaveLength(2); expect(html.querySelector('.table-responsive')).not.toBeNull();
  });
  it('carga los tres catálogos sin repetir peticiones pendientes', () => {
    const fixture = TestBed.createComponent(FrecuenciasLista); fixture.detectChanges(); const componente = fixture.componentInstance;
    expect(componente.cargando()).toBe(true); expect(componente.cargandoCatalogos()).toBe(true); componente.cargar(); componente.cargarCatalogos();
    completarCarga(); expect(componente.cargando()).toBe(false); expect(componente.cargandoCatalogos()).toBe(false);
  });
  it('distingue listado vacío de filtros sin coincidencias', () => {
    const fixture = crear([]); expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay frecuencias registradas');
    fixture.componentInstance.frecuencias.set([actual]); fixture.componentInstance.buscar('inexistente'); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay frecuencias que coincidan');
  });
  it('permite reintentar tras fallo de conexión', () => {
    const fixture = TestBed.createComponent(FrecuenciasLista); fixture.detectChanges(); http.expectOne(url).error(new ProgressEvent('error')); completarCatalogos();
    expect(fixture.componentInstance.error()).toContain('conexión'); expect(fixture.componentInstance.cargando()).toBe(false);
    fixture.componentInstance.cargar(); completarCarga(); expect(fixture.componentInstance.error()).toBeNull();
  });
  it.each([coops, rutas, resoluciones])('un fallo de %s no oculta frecuencias ni otros catálogos', fallido => {
    const fixture = TestBed.createComponent(FrecuenciasLista); fixture.detectChanges(); http.expectOne(url).flush([actual]);
    for (const endpoint of [coops, rutas, resoluciones]) {
      const peticion = http.expectOne(endpoint);
      if (endpoint === fallido) peticion.error(new ProgressEvent('error')); else peticion.flush([]);
    }
    fixture.detectChanges(); expect(fixture.componentInstance.frecuencias()).toEqual([actual]); expect(fixture.componentInstance.erroresCatalogos()).toHaveLength(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cooperativa #4');
    fixture.componentInstance.cargarCatalogos(); completarCatalogos(); expect(fixture.componentInstance.erroresCatalogos()).toEqual([]);
  });
  it('crea desde el formulario con 00:00 y evita doble envío', () => {
    const fixture = crear([]); const componente = fixture.componentInstance; componente.nueva(); fixture.detectChanges();
    const formulario = fixture.debugElement.query(By.directive(FrecuenciaFormulario)).componentInstance as FrecuenciaFormulario;
    formulario.guardar(); http.expectNone(url);
    formulario.form.patchValue({ cooperativaId: 4, rutaId: 2, resolucionAntId: 3, horaSalida: '00:00' }); formulario.guardar(); formulario.guardar();
    const peticion = http.expectOne(url); expect(peticion.request.method).toBe('POST'); expect(peticion.request.body).toEqual({ cooperativaId: 4, rutaId: 2, resolucionAntId: 3, codigo: null, horaSalida: '00:00:00' });
    expect(componente.guardando()).toBe(true); componente.cerrarPanel(); expect(componente.formularioVisible()).toBe(true);
    peticion.flush(actual, { status: 201, statusText: 'Created' }); completarCarga(); expect(componente.formularioVisible()).toBe(false); expect(componente.exito()).toContain('registrada');
  });
  it('documenta en pantalla un catálogo de rutas 404 y bloquea altas sin ocultar frecuencias', () => {
    const fixture = TestBed.createComponent(FrecuenciasLista); fixture.detectChanges();
    http.expectOne(url).flush([actual]);
    http.expectOne(coops).flush([{ id: 4, nombre: 'Cooperativa A' }]);
    http.expectOne(rutas).flush({}, { status: 404, statusText: 'Not Found' });
    http.expectOne(resoluciones).flush([{ id: 3, cooperativaId: 4, numeroResolucion: 'ANT-01', fechaResolucion: null, archivoUrl: null, activa: true }]);
    fixture.detectChanges(); const componente = fixture.componentInstance;
    expect(componente.frecuencias()).toEqual([actual]); expect((fixture.nativeElement as HTMLElement).textContent).toContain('rutas:');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ruta #2');
    componente.nueva(); const { id, activa, ...datos } = actual; componente.guardar({ modo: 'crear', datos }); http.expectNone(url);
  });
  it('consulta datos recientes y muestra detalle con todos sus identificadores', () => {
    const fixture = crear(); const componente = fixture.componentInstance; componente.abrir(actual, 'consultar');
    expect(componente.cargandoDetalle()).toBe(true); http.expectOne(`${url}/7`).flush({ ...actual, codigo: 'F-actual' }); fixture.detectChanges();
    expect(componente.detalleVisible()).toBe(true); expect(componente.formularioVisible()).toBe(false); expect((fixture.nativeElement as HTMLElement).textContent).toContain('F-actual');
    componente.cerrarPanel(); expect(componente.detalleVisible()).toBe(false);
  });
  it('edita conservando false, null y precisión TimeOnly', () => {
    const fixture = crear(); const componente = fixture.componentInstance; const inactiva = { ...actual, activa: false, horaSalida: '00:00:30.1234567' };
    componente.abrir(actual, 'editar'); http.expectOne(`${url}/7`).flush(inactiva); fixture.detectChanges();
    const formulario = fixture.debugElement.query(By.directive(FrecuenciaFormulario)).componentInstance as FrecuenciaFormulario;
    expect(formulario.form.controls.horaSalida.value).toBe('00:00'); formulario.guardar();
    const peticion = http.expectOne(`${url}/7`); expect(peticion.request.method).toBe('PUT'); expect(peticion.request.body.activa).toBe(false);
    expect(peticion.request.body.codigo).toBeNull(); expect(peticion.request.body.horaSalida).toBe(inactiva.horaSalida);
    peticion.flush(inactiva); completarCarga([inactiva]); expect(componente.frecuencias()[0].activa).toBe(false); expect(componente.exito()).toContain('actualizada');
  });
  it.each(['Ya existe una frecuencia para esa cooperativa, ruta y hora, aunque esté inactiva.', 'No se puede cambiar la estructura de una frecuencia referenciada por viajes, hojas de ruta o tarifas.'])('muestra el conflicto real: %s', mensaje => {
    const componente = crear().componentInstance; componente.abrir(actual, 'editar'); http.expectOne(`${url}/7`).flush(actual);
    const { id, ...datos } = actual; componente.guardar({ modo: 'editar', id, datos });
    http.expectOne(`${url}/7`).flush({ mensaje }, { status: 409, statusText: 'Conflict' });
    expect(componente.errorFormulario()).toBe(mensaje); expect(componente.formularioVisible()).toBe(true); expect(componente.guardando()).toBe(false);
  });
  it('rechaza una resolución ajena y evita convertir edición en alta o cambiar el estado', () => {
    const componente = crear().componentInstance; componente.nueva(); const { id, activa, ...datos } = actual;
    componente.guardar({ modo: 'crear', datos: { ...datos, resolucionAntId: 30 } }); expect(componente.errorFormulario()).toContain('cooperativa'); http.expectNone(url);
    componente.cerrarPanel(); componente.abrir(actual, 'editar'); http.expectOne(`${url}/7`).flush(actual);
    componente.guardar({ modo: 'crear', datos }); componente.guardar({ modo: 'editar', id: 8, datos: { ...datos, activa } });
    componente.guardar({ modo: 'editar', id, datos: { ...datos, activa: false } }); http.expectNone(url); http.expectNone(`${url}/7`);
  });
  it('solo desactiva tras confirmar y conserva el registro inactivo', () => {
    const fixture = crear(); const componente = fixture.componentInstance; const d = dialogo(fixture.nativeElement as HTMLElement);
    componente.solicitarBaja(actual); fixture.detectChanges(); expect(d.textContent).toContain('Frecuencia #7'); expect(d.textContent).toContain('00:00:00'); http.expectNone(`${url}/7`);
    componente.confirmarBaja(); componente.confirmarBaja(); componente.cancelarBaja(); expect(componente.pendienteBaja()).not.toBeNull();
    const peticion = http.expectOne(`${url}/7`); expect(peticion.request.method).toBe('DELETE'); peticion.flush(null, { status: 204, statusText: 'No Content' });
    completarCarga([{ ...actual, activa: false }]); expect(componente.frecuencias()[0].activa).toBe(false); expect(componente.exito()).toContain('desactivada'); expect(d.close).toHaveBeenCalledOnce();
  });
  it('cancela la confirmación y Escape sin enviar DELETE', () => {
    const fixture = crear(); const componente = fixture.componentInstance; const d = dialogo(fixture.nativeElement as HTMLElement);
    componente.solicitarBaja(actual); const evento = new Event('cancel', { cancelable: true }); componente.cancelarBaja(evento);
    expect(evento.defaultPrevented).toBe(true); expect(componente.pendienteBaja()).toBeNull(); expect(d.close).toHaveBeenCalledOnce(); http.expectNone(`${url}/7`);
  });
  it('no ofrece baja a inactivas y mantiene el resultado si falla la recarga', () => {
    const fixture = crear(); const componente = fixture.componentInstance; const d = dialogo(fixture.nativeElement as HTMLElement);
    componente.solicitarBaja({ ...actual, activa: false }); expect(d.showModal).not.toHaveBeenCalled();
    componente.solicitarBaja(actual); componente.confirmarBaja(); http.expectOne(`${url}/7`).flush(null);
    http.expectOne(url).error(new ProgressEvent('error')); completarCatalogos(); expect(componente.frecuencias()[0].activa).toBe(false);
  });
  it('muestra error de baja y bloquea confirmación si se pierde el permiso', () => {
    const fixture = crear(); const componente = fixture.componentInstance; dialogo(fixture.nativeElement as HTMLElement); componente.solicitarBaja(actual); componente.confirmarBaja();
    http.expectOne(`${url}/7`).flush({ mensaje: 'Conflicto de baja.' }, { status: 409, statusText: 'Conflict' });
    expect(componente.errorBaja()).toBe('Conflicto de baja.'); expect(componente.desactivando()).toBe(false);
    autorizado = false; componente.confirmarBaja(); expect(componente.errorBaja()).toContain('ADMIN'); http.expectNone(`${url}/7`);
  });
  it('filtra localmente por código, cooperativa, estado e información visible con paginación', () => {
    const filas = Array.from({ length: 12 }, (_, i) => ({ ...actual, id: i + 1, codigo: `F-${i + 1}`, cooperativaId: i === 11 ? 5 : 4, activa: i !== 11 }));
    const componente = crear(filas).componentInstance; expect(componente.filasPagina()).toHaveLength(10); componente.cambiarPagina(1); expect(componente.filasPagina()).toHaveLength(2);
    componente.buscar('Quito'); expect(componente.paginaActual()).toBe(1); expect(componente.filtradas()).toHaveLength(12);
    componente.filtrarCooperativa('5'); componente.filtrarEstado('inactiva'); expect(componente.filtradas()).toHaveLength(1);
    componente.limpiarFiltros(); componente.buscar('F-12'); expect(componente.filtradas()).toHaveLength(1); http.expectNone(url);
  });
  it('incluye cooperativas históricas en los filtros aunque falten en el catálogo', () => {
    const componente = crear([{ ...actual, cooperativaId: 99 }]).componentInstance;
    expect(componente.cooperativasFiltro().some(c => c.id === 99)).toBe(true); componente.filtrarCooperativa('99'); expect(componente.filtradas()).toHaveLength(1);
  });
  it('sin ADMIN no consulta ni permite acciones, incluso llamadas directas', () => {
    autorizado = false; const fixture = TestBed.createComponent(FrecuenciasLista); fixture.detectChanges(); const componente = fixture.componentInstance;
    componente.nueva(); componente.abrir(actual, 'editar'); componente.solicitarBaja(actual); componente.cargarCatalogos();
    expect(componente.formularioVisible()).toBe(false); expect((fixture.nativeElement as HTMLElement).textContent).toContain('sesión vigente con rol ADMIN');
    for (const endpoint of [url, coops, rutas, resoluciones, `${url}/7`]) http.expectNone(endpoint);
  });
  it.each([400, 401, 403, 404, 409, 500])('muestra HTTP %s sin abrir un formulario vacío', status => {
    const componente = crear().componentInstance; componente.abrir(actual, 'editar');
    http.expectOne(`${url}/7`).flush({ mensaje: 'Mensaje de negocio.' }, { status, statusText: 'Error' });
    expect(componente.error()).not.toBeNull(); expect(componente.cargandoDetalle()).toBe(false); expect(componente.formularioVisible()).toBe(false);
    if (status === 500) expect(componente.error()).not.toContain('Mensaje de negocio');
  });
});
