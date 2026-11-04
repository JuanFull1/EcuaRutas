import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../../services/api.config';
import { RolUsuario } from '../../models/usuario.model';
import { AuthService } from '../../services/auth.service';
import { ResolucionAntFormulario } from './resolucion-ant-formulario';
import { ResolucionAntDto } from './resolucion-ant.model';
import { ResolucionesAntLista } from './resoluciones-ant-lista';
import { By } from '@angular/platform-browser';

describe('ResolucionesAntLista', () => {
  const url = `${API_URL}/resoluciones-ant`;
  const catalogo = `${API_URL}/usuarios/cooperativas`;
  const actual: ResolucionAntDto = { id: 7, cooperativaId: 4, numeroResolucion: 'ANT-01', fechaResolucion: '2026-11-04', archivoUrl: null, activa: true };
  let http: HttpTestingController;
  let autorizado: boolean;

  let rolActual: RolUsuario;
  let cooperativaId: number | null;
  beforeEach(() => {
    autorizado = true; rolActual = 'ADMIN'; cooperativaId = 4;
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { usuarioActual: () => ({ rol: rolActual, cooperativaId }), tieneRol: (rol: string) => autorizado && rol === rolActual } }] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  const completarCarga = (filas: ResolucionAntDto[] = [actual]) => {
    http.expectOne(url).flush(filas);
    if (rolActual === 'ADMIN') http.expectOne(catalogo).flush([{ id: 4, nombre: 'Cooperativa de prueba' }]);
    else http.expectNone(catalogo);
  };
  const crear = (filas: ResolucionAntDto[] = [actual]) => {
    const fixture = TestBed.createComponent(ResolucionesAntLista);
    fixture.detectChanges(); completarCarga(filas); fixture.detectChanges(); return fixture;
  };
  const prepararDialogo = (elemento: HTMLElement) => {
    const dialogo = elemento.querySelector('dialog')!;
    dialogo.showModal = vi.fn(); dialogo.close = vi.fn(); return dialogo;
  };

  it('COOPERATIVA consulta solo sus resoluciones y entrega al formulario su unica cooperativa', () => {
    rolActual = 'COOPERATIVA';
    const fixture = crear([actual, { ...actual, id: 8, cooperativaId: 5 }]); const lista = fixture.componentInstance;
    expect(lista.resoluciones()).toEqual([actual]);
    expect(lista.cooperativas().map(c => c.id)).toEqual([4]);
    lista.nueva(); fixture.detectChanges();
    const formulario = fixture.debugElement.query(By.directive(ResolucionAntFormulario)).componentInstance as ResolucionAntFormulario;
    expect(formulario.cooperativas().map(c => c.id)).toEqual([4]);
    formulario.form.patchValue({ cooperativaId: 5, numeroResolucion: 'AJENA' }); formulario.guardar();
    expect(formulario.form.invalid).toBe(true); http.expectNone(r => r.method === 'POST');
    formulario.cancelar.emit(); fixture.detectChanges(); expect(lista.formularioVisible()).toBe(false);
  });

  it('COOPERATIVA conserva el alta propia y rechaza un evento que suplanta la cooperativa', () => {
    rolActual = 'COOPERATIVA'; const lista = crear([]).componentInstance; lista.nueva();
    lista.guardar({ modo: 'crear', datos: { cooperativaId: 5, numeroResolucion: 'AJENA', fechaResolucion: null, archivoUrl: null } });
    expect(lista.errorFormulario()).toContain('autenticada'); http.expectNone(r => r.method === 'POST');
    lista.guardar({ modo: 'crear', datos: { cooperativaId: 4, numeroResolucion: 'ANT-01', fechaResolucion: null, archivoUrl: null } });
    const alta = http.expectOne(url); expect(alta.request.body).toEqual({ cooperativaId: 4, numeroResolucion: 'ANT-01', fechaResolucion: null, archivoUrl: null });
    alta.flush(actual); completarCarga(); expect(lista.formularioVisible()).toBe(false);
  });

  it('COOPERATIVA rechaza detalle, edicion y baja ajenos incluso por llamadas directas', () => {
    rolActual = 'COOPERATIVA'; const lista = crear().componentInstance; const ajena = { ...actual, id: 8, cooperativaId: 5 };
    lista.abrir(ajena, 'editar'); lista.solicitarBaja(ajena);
    lista.pendienteBaja.set(ajena); lista.confirmarBaja();
    http.expectNone(r => r.url.endsWith('/8'));
    lista.pendienteBaja.set(null); lista.abrir(actual, 'editar'); http.expectOne(`${url}/7`).flush(actual);
    lista.guardar({ modo: 'editar', id: 7, datos: { ...actual, cooperativaId: 5 } });
    expect(lista.errorFormulario()).toContain('autenticada'); http.expectNone(r => r.method === 'PUT');
  });

  it('COOPERATIVA mantiene visibles los errores HTTP de autorizacion sin abrir un registro', () => {
    rolActual = 'COOPERATIVA'; const lista = crear().componentInstance; lista.abrir(actual, 'editar');
    http.expectOne(`${url}/7`).flush({}, { status: 404, statusText: 'Not Found' });
    expect(lista.error()).toBeTruthy(); expect(lista.formularioVisible()).toBe(false);
  });

  it.each([null, 0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1])('COOPERATIVA sin identificador valido %s no consulta ni habilita acciones', id => {
    rolActual = 'COOPERATIVA'; cooperativaId = id;
    const fixture = TestBed.createComponent(ResolucionesAntLista); fixture.detectChanges();
    expect(fixture.componentInstance.puedeGestionar()).toBe(false);
    http.expectNone(() => true);
  });

  it.each(['CLIENTE', 'OFICINISTA', 'BUS'] as const)('el listado rechaza el rol %s aunque tenga cooperativa', rol => {
    rolActual = rol; const fixture = TestBed.createComponent(ResolucionesAntLista); fixture.detectChanges();
    expect(fixture.componentInstance.puedeGestionar()).toBe(false); http.expectNone(() => true);
  });

  it('renderiza encabezado, nombres, fecha civil, estados y columnas responsive', () => {
    const fixture = crear([actual, { ...actual, id: 8, activa: false }]); const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Gestión de resoluciones ANT');
    expect(html.textContent).toContain('Cooperativa de prueba'); expect(html.textContent).toContain('2026-11-04');
    expect(html.textContent).toContain('Inactiva'); expect(html.querySelector('.table-responsive')).not.toBeNull();
    expect(html.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('muestra carga y evita consultas repetidas mientras espera', () => {
    const fixture = TestBed.createComponent(ResolucionesAntLista); fixture.detectChanges(); const componente = fixture.componentInstance;
    expect(componente.cargando()).toBe(true); expect(componente.cargandoCooperativas()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cargando resoluciones');
    componente.cargar(); completarCarga(); expect(componente.cargando()).toBe(false);
  });

  it('presenta listado vacío y ausencia de coincidencias por separado', () => {
    const fixture = crear([]); expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay resoluciones ANT registradas');
    fixture.componentInstance.resoluciones.set([actual]); fixture.componentInstance.buscar('inexistente'); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay resoluciones que coincidan');
  });

  it('maneja error de conexión y permite reintentar', () => {
    const fixture = TestBed.createComponent(ResolucionesAntLista); fixture.detectChanges();
    http.expectOne(url).error(new ProgressEvent('error')); http.expectOne(catalogo).flush([]);
    expect(fixture.componentInstance.error()).toContain('conexión'); expect(fixture.componentInstance.cargando()).toBe(false);
    fixture.componentInstance.cargar(); completarCarga(); expect(fixture.componentInstance.error()).toBeNull();
  });

  it('conserva resoluciones aunque falle el catálogo de cooperativas', () => {
    const fixture = TestBed.createComponent(ResolucionesAntLista); fixture.detectChanges(); http.expectOne(url).flush([actual]);
    http.expectOne(catalogo).error(new ProgressEvent('error')); fixture.detectChanges();
    expect(fixture.componentInstance.resoluciones()).toEqual([actual]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cooperativa #4');
    expect(fixture.componentInstance.errorCooperativas()).toContain('conexión');
    fixture.componentInstance.cargarCooperativas(); http.expectOne(catalogo).flush([{ id: 4, nombre: 'Cooperativa de prueba' }]);
    expect(fixture.componentInstance.nombreCooperativa(4)).toBe('Cooperativa de prueba');
  });

  it('abre formulario, valida, registra una sola vez y refresca la tabla', () => {
    const fixture = crear([]); const componente = fixture.componentInstance; componente.nueva(); fixture.detectChanges();
    const formulario = fixture.debugElement.query(By.directive(ResolucionAntFormulario)).componentInstance as ResolucionAntFormulario;
    formulario.guardar(); http.expectNone(url);
    formulario.form.patchValue({ cooperativaId: 4, numeroResolucion: 'ANT-01' }); formulario.guardar();
    componente.guardar({ modo: 'crear', datos: { cooperativaId: 4, numeroResolucion: 'ANT-01', fechaResolucion: null, archivoUrl: null } });
    const peticion = http.expectOne(url); expect(peticion.request.method).toBe('POST'); expect(componente.guardando()).toBe(true);
    expect(peticion.request.body).toEqual({ cooperativaId: 4, numeroResolucion: 'ANT-01', fechaResolucion: null, archivoUrl: null });
    peticion.flush(actual, { status: 201, statusText: 'Created' }); completarCarga();
    expect(componente.formularioVisible()).toBe(false); expect(componente.guardando()).toBe(false);
    expect(componente.exito()).toContain('registrada'); expect(componente.resoluciones()).toEqual([actual]);
  });

  it('consulta datos actuales por GET y muestra detalle independiente del formulario', () => {
    const fixture = crear(); const componente = fixture.componentInstance; componente.abrir(actual, 'consultar');
    expect(componente.cargandoDetalle()).toBe(true);
    http.expectOne(`${url}/7`).flush({ ...actual, numeroResolucion: 'ANT actualizada' }); fixture.detectChanges();
    expect(componente.detalleVisible()).toBe(true); expect(componente.formularioVisible()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('ANT actualizada'); componente.cerrarPanel();
    expect(componente.detalleVisible()).toBe(false);
  });

  it('edita datos recientes y conserva false y null en PUT', () => {
    const inactiva = { ...actual, activa: false, fechaResolucion: null }; const fixture = crear(); const componente = fixture.componentInstance;
    componente.abrir(actual, 'editar'); http.expectOne(`${url}/7`).flush(inactiva); fixture.detectChanges();
    const formulario = fixture.debugElement.query(By.directive(ResolucionAntFormulario)).componentInstance as ResolucionAntFormulario;
    formulario.form.controls.numeroResolucion.setValue('ANT editada'); formulario.guardar();
    const peticion = http.expectOne(`${url}/7`); expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body.activa).toBe(false); expect(peticion.request.body.fechaResolucion).toBeNull();
    expect(peticion.request.body.archivoUrl).toBeNull();
    peticion.flush({ ...inactiva, numeroResolucion: 'ANT editada' }); completarCarga([{ ...inactiva, numeroResolucion: 'ANT editada' }]);
    expect(componente.exito()).toContain('actualizada'); expect(componente.resoluciones()[0].activa).toBe(false);
  });

  it('muestra conflicto de cooperativa referenciada y conserva el formulario para corregir', () => {
    const fixture = crear(); const componente = fixture.componentInstance;
    componente.abrir(actual, 'editar'); http.expectOne(`${url}/7`).flush(actual);
    const { id, ...datos } = actual; componente.guardar({ modo: 'editar', id, datos });
    http.expectOne(`${url}/7`).flush({ mensaje: 'No se puede cambiar la cooperativa de una resolución referenciada.' }, { status: 409, statusText: 'Conflict' });
    expect(componente.errorFormulario()).toContain('referenciada'); expect(componente.formularioVisible()).toBe(true);
    expect(componente.guardando()).toBe(false);
  });

  it('no convierte edición en creación, no cambia estado y exige permisos al guardar', () => {
    const componente = crear().componentInstance; componente.abrir(actual, 'editar'); http.expectOne(`${url}/7`).flush(actual);
    const { id, ...datos } = actual;
    componente.guardar({ modo: 'crear', datos }); componente.guardar({ modo: 'editar', id: 8, datos });
    componente.guardar({ modo: 'editar', id, datos: { ...datos, activa: false } });
    autorizado = false; componente.guardar({ modo: 'editar', id, datos });
    http.expectNone(url); http.expectNone(`${url}/7`);
  });

  it('confirma desactivación antes de enviar DELETE y conserva el registro inactivo', () => {
    const fixture = crear(); const componente = fixture.componentInstance;
    const dialogo = prepararDialogo(fixture.nativeElement as HTMLElement); componente.solicitarBaja(actual);
    expect(dialogo.showModal).toHaveBeenCalledOnce(); http.expectNone(`${url}/7`);
    fixture.detectChanges(); expect(dialogo.textContent).toContain('ANT-01');
    componente.confirmarBaja(); componente.confirmarBaja(); componente.cancelarBaja();
    expect(componente.pendienteBaja()).not.toBeNull(); expect(componente.desactivando()).toBe(true);
    const peticion = http.expectOne(`${url}/7`); expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null, { status: 204, statusText: 'No Content' }); completarCarga([{ ...actual, activa: false }]);
    expect(componente.resoluciones()).toEqual([{ ...actual, activa: false }]); expect(componente.exito()).toContain('desactivada');
    expect(dialogo.close).toHaveBeenCalledOnce(); expect(componente.pendienteBaja()).toBeNull();
  });

  it('permite cancelar confirmación sin enviar DELETE, incluido Escape', () => {
    const fixture = crear(); const componente = fixture.componentInstance; const dialogo = prepararDialogo(fixture.nativeElement as HTMLElement);
    componente.solicitarBaja(actual); const evento = new Event('cancel', { cancelable: true }); componente.cancelarBaja(evento);
    expect(evento.defaultPrevented).toBe(true); expect(componente.pendienteBaja()).toBeNull();
    expect(dialogo.close).toHaveBeenCalledOnce(); http.expectNone(`${url}/7`);
  });

  it('permite reintentar baja tras conflicto y respeta pérdida de permisos', () => {
    const fixture = crear(); const componente = fixture.componentInstance; prepararDialogo(fixture.nativeElement as HTMLElement);
    componente.solicitarBaja(actual); componente.confirmarBaja();
    http.expectOne(`${url}/7`).flush({ mensaje: 'Conflicto de operación.' }, { status: 409, statusText: 'Conflict' });
    expect(componente.errorBaja()).toBe('Conflicto de operación.'); expect(componente.desactivando()).toBe(false);
    autorizado = false; componente.confirmarBaja(); http.expectNone(`${url}/7`); expect(componente.errorBaja()).toContain('autorizada');
  });

  it('mantiene la baja local si falla la recarga posterior', () => {
    const fixture = crear(); const componente = fixture.componentInstance; prepararDialogo(fixture.nativeElement as HTMLElement);
    componente.solicitarBaja(actual); componente.confirmarBaja(); http.expectOne(`${url}/7`).flush(null);
    http.expectOne(url).error(new ProgressEvent('error')); http.expectOne(catalogo).flush([]);
    expect(componente.resoluciones()[0].activa).toBe(false); expect(componente.error()).toContain('conexión');
  });

  it('filtra por número, cooperativa y estado y pagina sin consultas adicionales', () => {
    const filas = Array.from({ length: 12 }, (_, i) => ({ ...actual, id: i + 1, numeroResolucion: `ANT-${i + 1}`, activa: i !== 11 }));
    const componente = crear(filas).componentInstance; expect(componente.filasPagina()).toHaveLength(10);
    componente.cambiarPagina(1); expect(componente.filasPagina()).toHaveLength(2);
    componente.buscar('cooperativa de prueba'); expect(componente.paginaActual()).toBe(1); expect(componente.filtradas()).toHaveLength(12);
    componente.filtrarEstado('inactiva'); expect(componente.filtradas()).toHaveLength(1);
    componente.limpiarFiltros(); componente.buscar('ANT-12'); expect(componente.filtradas()).toHaveLength(1);
    http.expectNone(url); http.expectNone(catalogo);
  });

  it('sin rol ADMIN no consulta catálogos ni permite abrir acciones', () => {
    autorizado = false; const fixture = TestBed.createComponent(ResolucionesAntLista); fixture.detectChanges(); const componente = fixture.componentInstance;
    componente.nueva(); componente.abrir(actual, 'consultar'); componente.abrir(actual, 'editar'); componente.solicitarBaja(actual);
    expect(componente.formularioVisible()).toBe(false); expect(componente.detalleVisible()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('sesión vigente con rol ADMIN');
    http.expectNone(url); http.expectNone(catalogo); http.expectNone(`${url}/7`);
  });

  it('oculta enlaces de documentos con esquemas inseguros', () => {
    const fixture = crear([{ ...actual, archivoUrl: 'javascript:alert(1)' }]); const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('a[href]')).toBeNull(); expect(html.textContent).toContain('URL sin enlace disponible');
  });

  it.each([400, 401, 403, 404, 409, 500])('muestra HTTP %s al cargar detalle y libera el estado', status => {
    const componente = crear().componentInstance; componente.abrir(actual, 'editar');
    http.expectOne(`${url}/7`).flush({ mensaje: 'Mensaje del backend.' }, { status, statusText: 'Error' });
    expect(componente.error()).not.toBeNull(); expect(componente.cargandoDetalle()).toBe(false);
    expect(componente.formularioVisible()).toBe(false);
    if (status === 500) expect(componente.error()).not.toContain('Mensaje del backend');
  });
});
