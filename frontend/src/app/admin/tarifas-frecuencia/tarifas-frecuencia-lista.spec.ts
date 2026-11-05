import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { API_URL } from '../../services/api.config';
import { AuthService } from '../../services/auth.service';
import { FrecuenciaDto } from '../frecuencias/frecuencia.model';
import { RutaParadaDto } from '../paradas/ruta-parada.model';
import { TarifaFrecuenciaFormulario } from './tarifa-frecuencia-formulario';
import { TarifaFrecuenciaDto } from './tarifa-frecuencia.model';
import { TarifasFrecuenciaLista } from './tarifas-frecuencia-lista';

describe('TarifasFrecuenciaLista', () => {
  const frecuenciasUrl = `${API_URL}/frecuencias`;
  const url = `${frecuenciasUrl}/11/tarifas`;
  const paradasUrl = `${API_URL}/rutas/22/paradas`;
  const frecuencia: FrecuenciaDto = { id: 11, rutaId: 22, cooperativaId: 4, resolucionAntId: 3, codigo: 'F-01', horaSalida: '00:00:00', activa: true };
  const otra = { ...frecuencia, id: 12, rutaId: 33 };
  const actual: TarifaFrecuenciaDto = { id: 7, frecuenciaId: 11, origenRutaParadaId: 90, destinoRutaParadaId: 10, precioBase: 5.25, activa: true };
  const parada = (id: number, orden: number, rutaId = 22): RutaParadaDto => ({ id, orden, rutaId, lugarId: id + 1000, kmAcumulado: null, minutosAcumulados: null, permiteAscenso: true, permiteDescenso: true });
  const paradas = [parada(10, 2), parada(20, 3), parada(90, 0), parada(80, 1), parada(50, 4, 99)];
  let http: HttpTestingController; let autorizado: boolean;
  beforeEach(() => {
    autorizado = true;
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: { tieneRol: (rol: string) => autorizado && rol === 'ADMIN' } }] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  const completarNombres = () => {
    http.expectOne(`${API_URL}/usuarios/cooperativas`).flush([{ id: 4, nombre: 'Cooperativa A' }]);
    http.expectOne(`${API_URL}/rutas`).flush([{ id: 22, nombre: 'Quito – Cuenca', origenLugarId: 1090, destinoLugarId: 1010, tipoViaje: 'CON_PARADAS', activa: true }]);
    http.expectOne(`${API_URL}/lugares`).flush([{ id: 1090, nombre: 'Quito', provincia: null, canton: null, tipo: 'CIUDAD', ubicacion: null, activo: true },
      { id: 1010, nombre: 'Cuenca', provincia: null, canton: null, tipo: 'CIUDAD', ubicacion: null, activo: true }]);
  };
  const crearInicial = () => {
    const fixture = TestBed.createComponent(TarifasFrecuenciaLista); fixture.detectChanges();
    http.expectOne(frecuenciasUrl).flush([frecuencia, otra]); completarNombres(); fixture.detectChanges(); return fixture;
  };
  const crear = (tarifas: TarifaFrecuenciaDto[] = [actual], contexto: FrecuenciaDto = frecuencia) => {
    const fixture = crearInicial(); fixture.componentInstance.seleccionarFrecuencia(11); http.expectOne(`${frecuenciasUrl}/11`).flush(contexto);
    http.expectOne(url).flush(tarifas); http.expectOne(`${API_URL}/rutas/${contexto.rutaId}/paradas`).flush(paradas.map(p => p.rutaId === 22 ? { ...p, rutaId: contexto.rutaId } : p));
    fixture.detectChanges(); return fixture;
  };
  const prepararDialogo = (elemento: HTMLElement) => { const d = elemento.querySelector('dialog')!; d.showModal = vi.fn(); d.close = vi.fn(); return d; };

  it('carga frecuencias y nombres y exige selección antes de Nueva tarifa', () => {
    const fixture = crearInicial(); const componente = fixture.componentInstance; const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Gestión de tarifas'); expect(html.textContent).toContain('Cooperativa A'); expect(html.textContent).toContain('Quito – Cuenca');
    expect(componente.puedeCrear()).toBe(false); componente.nueva(); expect(componente.formularioVisible()).toBe(false);
    http.expectNone(url); http.expectNone(paradasUrl);
  });
  it('obtiene RutaId de la consulta actual de frecuencia, no del catálogo obsoleto', () => {
    const fixture = crear([actual], { ...frecuencia, rutaId: 44 });
    expect(fixture.componentInstance.contexto()?.rutaId).toBe(44); http.expectNone(paradasUrl);
    expect(fixture.componentInstance.paradasOrdenadas().map(p => p.id)).toEqual([90, 80, 10, 20]);
  });
  it('renderiza recorrido, precios, inactivas y tabla responsive', () => {
    const fixture = crear([actual, { ...actual, id: 8, origenRutaParadaId: 80, destinoRutaParadaId: 20, activa: false, precioBase: 0 }]);
    const html = fixture.nativeElement as HTMLElement;
    for (const texto of ['Quito', 'Cuenca', '5.25', '0.00', 'Inactiva']) expect(html.textContent).toContain(texto);
    expect(html.querySelector('.table-responsive')).not.toBeNull(); expect(html.querySelectorAll('tbody tr')).toHaveLength(2);
  });
  it('representa cargas de frecuencia, paradas y tarifas', () => {
    const fixture = TestBed.createComponent(TarifasFrecuenciaLista); fixture.detectChanges(); const componente = fixture.componentInstance;
    expect(componente.cargandoFrecuencias()).toBe(true); http.expectOne(frecuenciasUrl).flush([frecuencia]); completarNombres();
    componente.seleccionarFrecuencia(11); expect(componente.cargandoContexto()).toBe(true);
    http.expectOne(`${frecuenciasUrl}/11`).flush(frecuencia); expect(componente.cargandoTarifas()).toBe(true); expect(componente.cargandoParadas()).toBe(true);
    http.expectOne(url).flush([]); http.expectOne(paradasUrl).flush([]); expect(componente.ocupado()).toBe(false);
  });
  it('distingue frecuencia sin tarifas, sin coincidencias y ruta sin paradas', () => {
    const fixture = crear([]); const componente = fixture.componentInstance;
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Esta frecuencia no tiene tarifas');
    componente.tarifas.set([actual]); componente.buscar('inexistente'); fixture.detectChanges(); expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay tarifas que coincidan');
    componente.paradas.set([]); fixture.detectChanges(); expect((fixture.nativeElement as HTMLElement).textContent).toContain('La ruta no tiene paradas'); expect(componente.puedeCrear()).toBe(false);
  });
  it('cancela una frecuencia pendiente cuando cambia la selección', () => {
    const componente = crearInicial().componentInstance; componente.seleccionarFrecuencia(11); const anterior = http.expectOne(`${frecuenciasUrl}/11`);
    componente.seleccionarFrecuencia(12); expect(anterior.cancelled).toBe(true); http.expectOne(`${frecuenciasUrl}/12`).flush(otra);
    http.expectOne(`${frecuenciasUrl}/12/tarifas`).flush([]); http.expectOne(`${API_URL}/rutas/33/paradas`).flush([]);
    expect(componente.contexto()?.id).toBe(12); expect(componente.tarifas()).toEqual([]);
  });
  it('cancela tarifas y paradas del contexto anterior y limpia filtros y datos', () => {
    const componente = crearInicial().componentInstance; componente.seleccionarFrecuencia(11); http.expectOne(`${frecuenciasUrl}/11`).flush(frecuencia);
    const tarifasAnteriores = http.expectOne(url); const paradasAnteriores = http.expectOne(paradasUrl); componente.buscar('Quito');
    componente.seleccionarFrecuencia(12); expect(tarifasAnteriores.cancelled).toBe(true); expect(paradasAnteriores.cancelled).toBe(true); expect(componente.busqueda()).toBe('');
    http.expectOne(`${frecuenciasUrl}/12`).flush(otra); http.expectOne(`${frecuenciasUrl}/12/tarifas`).flush([{ ...actual, id: 9, frecuenciaId: 12 }]);
    http.expectOne(`${API_URL}/rutas/33/paradas`).flush(paradas.map(p => ({ ...p, rutaId: 33 })));
    expect(componente.tarifas()[0].frecuenciaId).toBe(12);
  });
  it('cancela un detalle pendiente al cambiar de frecuencia', () => {
    const componente = crear().componentInstance; componente.abrir(actual, 'consultar'); const detalle = http.expectOne(`${url}/7`);
    componente.seleccionarFrecuencia(12); expect(detalle.cancelled).toBe(true); expect(componente.detalleVisible()).toBe(false);
    http.expectOne(`${frecuenciasUrl}/12`).flush(otra); http.expectOne(`${frecuenciasUrl}/12/tarifas`).flush([]); http.expectOne(`${API_URL}/rutas/33/paradas`).flush([]);
  });
  it('limpia selección sin reutilizar paradas ni tarifas y rechaza identificadores no válidos', () => {
    const componente = crear().componentInstance;
    for (const id of [0, -1, 999, 1.5]) componente.seleccionarFrecuencia(id);
    expect(componente.contexto()?.id).toBe(11); componente.seleccionarDesdeControl(''); expect(componente.contexto()).toBeNull();
    expect(componente.tarifas()).toEqual([]); expect(componente.paradas()).toEqual([]); http.expectNone(`${frecuenciasUrl}/999`);
  });
  it('con paradas 404 conserva consulta y baja pero bloquea registro y edición', () => {
    const fixture = crearInicial(); const componente = fixture.componentInstance; componente.seleccionarFrecuencia(11); http.expectOne(`${frecuenciasUrl}/11`).flush(frecuencia);
    http.expectOne(url).flush([actual]); http.expectOne(paradasUrl).flush({}, { status: 404, statusText: 'Not Found' }); fixture.detectChanges();
    expect(componente.puedeCrear()).toBe(false); componente.nueva(); componente.abrir(actual, 'editar'); http.expectNone(`${url}/7`);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Parada #90'); expect((fixture.nativeElement as HTMLElement).textContent).toContain('No se pueden registrar ni editar');
    componente.abrir(actual, 'consultar'); http.expectOne(`${url}/7`).flush(actual); expect(componente.detalleVisible()).toBe(true); componente.cerrarPanel();
    prepararDialogo(fixture.nativeElement as HTMLElement); componente.solicitarBaja(actual); componente.confirmarBaja();
    http.expectOne(`${url}/7`).flush(null, { status: 204, statusText: 'No Content' }); http.expectOne(url).flush([{ ...actual, activa: false }]);
    expect(componente.tarifas()[0].activa).toBe(false);
  });
  it('un fallo de nombres no impide usar paradas reales ni inventa nombres', () => {
    const fixture = TestBed.createComponent(TarifasFrecuenciaLista); fixture.detectChanges(); http.expectOne(frecuenciasUrl).flush([frecuencia]);
    for (const endpoint of [`${API_URL}/usuarios/cooperativas`, `${API_URL}/rutas`, `${API_URL}/lugares`]) http.expectOne(endpoint).error(new ProgressEvent('error'));
    const componente = fixture.componentInstance; componente.seleccionarFrecuencia(11); http.expectOne(`${frecuenciasUrl}/11`).flush(frecuencia);
    http.expectOne(url).flush([actual]); http.expectOne(paradasUrl).flush(paradas);
    expect(componente.puedeCrear()).toBe(true); expect(componente.nombreParada(90)).toContain('Lugar #1090'); expect(componente.avisosNombres()).toHaveLength(3);
  });
  it('crea desde el formulario con precio cero y evita doble envío y cambio de contexto', () => {
    const fixture = crear([]); const componente = fixture.componentInstance; componente.nueva(); fixture.detectChanges();
    const formulario = fixture.debugElement.query(By.directive(TarifaFrecuenciaFormulario)).componentInstance as TarifaFrecuenciaFormulario;
    formulario.form.patchValue({ origenRutaParadaId: 90, destinoRutaParadaId: 10, precioBase: '0' }); formulario.guardar(); formulario.guardar();
    const peticion = http.expectOne(url); expect(peticion.request.method).toBe('POST'); expect(peticion.request.body).toEqual({ origenRutaParadaId: 90, destinoRutaParadaId: 10, precioBase: 0 });
    componente.seleccionarFrecuencia(12); componente.cerrarPanel(); expect(componente.frecuenciaId()).toBe(11); expect(componente.guardando()).toBe(true);
    peticion.flush({ ...actual, precioBase: 0 }, { status: 201, statusText: 'Created' }); http.expectOne(url).flush([{ ...actual, precioBase: 0 }]);
    expect(componente.formularioVisible()).toBe(false); expect(componente.exito()).toContain('registrada');
  });
  it('edita usando GET contextual y conserva frecuencia y false', () => {
    const fixture = crear(); const componente = fixture.componentInstance; const inactiva = { ...actual, activa: false };
    componente.abrir(actual, 'editar'); http.expectOne(`${url}/7`).flush(inactiva); fixture.detectChanges();
    const formulario = fixture.debugElement.query(By.directive(TarifaFrecuenciaFormulario)).componentInstance as TarifaFrecuenciaFormulario;
    formulario.form.controls.precioBase.setValue('12,34'); formulario.guardar(); const peticion = http.expectOne(`${url}/7`);
    expect(peticion.request.method).toBe('PUT'); expect(peticion.request.body).toEqual({ origenRutaParadaId: 90, destinoRutaParadaId: 10, precioBase: 12.34, activa: false });
    peticion.flush({ ...inactiva, precioBase: 12.34 }); http.expectOne(url).flush([{ ...inactiva, precioBase: 12.34 }]); expect(componente.tarifas()[0].activa).toBe(false);
  });
  it('muestra 409 por tramo duplicado aunque la tarifa existente esté inactiva', () => {
    const fixture = crear([{ ...actual, activa: false }]); const componente = fixture.componentInstance; componente.nueva(); fixture.detectChanges();
    const formulario = fixture.debugElement.query(By.directive(TarifaFrecuenciaFormulario)).componentInstance as TarifaFrecuenciaFormulario;
    formulario.form.patchValue({ origenRutaParadaId: 90, destinoRutaParadaId: 10, precioBase: '4.25' }); formulario.guardar();
    http.expectOne(url).flush({ mensaje: 'Ya existe una tarifa para ese tramo, aunque esté inactiva.' }, { status: 409, statusText: 'Conflict' });
    expect(componente.errorFormulario()).toContain('inactiva'); expect(componente.formularioVisible()).toBe(true); expect(componente.guardando()).toBe(false);
  });
  it('rechaza respuestas, eventos y tarifas de otra frecuencia', () => {
    const componente = crear().componentInstance; const ajena = { ...actual, frecuenciaId: 12 };
    componente.abrir(ajena, 'consultar'); componente.solicitarBaja(ajena); http.expectNone(`${url}/7`);
    componente.abrir(actual, 'editar'); http.expectOne(`${url}/7`).flush(ajena); expect(componente.formularioVisible()).toBe(false); expect(componente.errorTarifas()).toContain('contexto');
    componente.nueva(); componente.guardar({ frecuenciaId: 12, modo: 'crear', datos: { origenRutaParadaId: 90, destinoRutaParadaId: 10, precioBase: 5 } }); http.expectNone(url);
  });
  it('vuelve a validar tramo y precio antes de enviar eventos de guardado', () => {
    const componente = crear().componentInstance; componente.nueva();
    for (const precioBase of [-1, 1.001, 100000000, NaN]) componente.guardar({ modo: 'crear', frecuenciaId: 11, datos: { origenRutaParadaId: 90, destinoRutaParadaId: 10, precioBase } });
    componente.guardar({ modo: 'crear', frecuenciaId: 11, datos: { origenRutaParadaId: 10, destinoRutaParadaId: 90, precioBase: 5 } }); http.expectNone(url);
  });
  it('desactiva tras confirmación, preserva el registro y no cambia frecuencia ni paradas', () => {
    const fixture = crear(); const componente = fixture.componentInstance; const d = prepararDialogo(fixture.nativeElement as HTMLElement);
    componente.solicitarBaja(actual); fixture.detectChanges(); expect(d.textContent).toContain('Quito'); expect(d.textContent).toContain('Cuenca'); http.expectNone(`${url}/7`);
    componente.confirmarBaja(); componente.confirmarBaja(); componente.cancelarBaja(); expect(componente.pendienteBaja()).not.toBeNull();
    const peticion = http.expectOne(`${url}/7`); expect(peticion.request.method).toBe('DELETE'); peticion.flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(url).flush([{ ...actual, activa: false }]); expect(componente.tarifas()[0].activa).toBe(false); expect(componente.exito()).toContain('desactivada');
    expect(componente.contexto()).toEqual(frecuencia); expect(componente.paradasOrdenadas()).toHaveLength(4); expect(d.close).toHaveBeenCalledOnce();
  });
  it('cancela confirmación y Escape sin enviar DELETE', () => {
    const fixture = crear(); const componente = fixture.componentInstance; const d = prepararDialogo(fixture.nativeElement as HTMLElement); componente.solicitarBaja(actual);
    const evento = new Event('cancel', { cancelable: true }); componente.cancelarBaja(evento); expect(evento.defaultPrevented).toBe(true); expect(d.close).toHaveBeenCalledOnce(); http.expectNone(`${url}/7`);
  });
  it('maneja error de baja y pérdida de permiso al confirmar', () => {
    const fixture = crear(); const componente = fixture.componentInstance; prepararDialogo(fixture.nativeElement as HTMLElement); componente.solicitarBaja(actual); componente.confirmarBaja();
    http.expectOne(`${url}/7`).flush({ mensaje: 'Conflicto de baja.' }, { status: 409, statusText: 'Conflict' }); expect(componente.errorBaja()).toBe('Conflicto de baja.');
    autorizado = false; componente.confirmarBaja(); expect(componente.errorBaja()).toContain('ADMIN'); http.expectNone(`${url}/7`);
  });
  it('conserva baja local si falla la recarga y permite reintentar', () => {
    const fixture = crear(); const componente = fixture.componentInstance; prepararDialogo(fixture.nativeElement as HTMLElement); componente.solicitarBaja(actual); componente.confirmarBaja();
    http.expectOne(`${url}/7`).flush(null); http.expectOne(url).error(new ProgressEvent('error')); expect(componente.tarifas()[0].activa).toBe(false);
    componente.cargarTarifas(); http.expectOne(url).flush([{ ...actual, activa: false }]); expect(componente.errorTarifas()).toBeNull();
  });
  it('filtra por recorrido y estado y ordena por Orden sin comparar los IDs', () => {
    const filas = Array.from({ length: 12 }, (_, i) => ({ ...actual, id: i + 1, origenRutaParadaId: i === 0 ? 80 : 90, activa: i !== 11 }));
    const componente = crear(filas).componentInstance; expect(componente.filtradas()[0].origenRutaParadaId).toBe(90);
    expect(componente.filasPagina()).toHaveLength(10); componente.cambiarPagina(1); expect(componente.filasPagina()).toHaveLength(2);
    componente.buscar('Quito'); expect(componente.paginaActual()).toBe(1); expect(componente.filtradas()).toHaveLength(11);
    componente.filtrarEstado('inactiva'); expect(componente.filtradas()).toHaveLength(1); componente.limpiarFiltros(); expect(componente.filtradas()).toHaveLength(12); http.expectNone(url);
  });
  it('no ofrece alta en frecuencia inactiva pero permite consultar', () => {
    const componente = crear([actual], { ...frecuencia, activa: false }).componentInstance; expect(componente.puedeCrear()).toBe(false); componente.nueva(); expect(componente.formularioVisible()).toBe(false);
    componente.abrir(actual, 'consultar'); http.expectOne(`${url}/7`).flush(actual); expect(componente.detalleVisible()).toBe(true);
  });
  it('sin ADMIN no consulta ni permite acciones directas', () => {
    autorizado = false; const fixture = TestBed.createComponent(TarifasFrecuenciaLista); fixture.detectChanges(); const componente = fixture.componentInstance;
    componente.seleccionarFrecuencia(11); componente.nueva(); componente.abrir(actual, 'editar'); componente.solicitarBaja(actual);
    expect(componente.formularioVisible()).toBe(false); expect((fixture.nativeElement as HTMLElement).textContent).toContain('rol ADMIN');
    http.expectNone(() => true);
  });
  it('muestra error de frecuencias y permite reintentar sin inventar opciones', () => {
    const fixture = TestBed.createComponent(TarifasFrecuenciaLista); fixture.detectChanges(); http.expectOne(frecuenciasUrl).error(new ProgressEvent('error')); completarNombres();
    expect(fixture.componentInstance.errorFrecuencias()).toContain('conexión'); expect(fixture.componentInstance.frecuencias()).toEqual([]);
    fixture.componentInstance.cargarFrecuencias(); http.expectOne(frecuenciasUrl).flush([]); expect(fixture.componentInstance.errorFrecuencias()).toBeNull();
  });
  it.each([400, 401, 403, 404, 409, 500])('maneja HTTP %s en el contexto sin consultar rutas ficticias', status => {
    const componente = crearInicial().componentInstance; componente.seleccionarFrecuencia(11);
    http.expectOne(`${frecuenciasUrl}/11`).flush({ mensaje: 'Mensaje del backend.' }, { status, statusText: 'Error' });
    expect(componente.contexto()).toBeNull(); expect(componente.errorContexto()).not.toBeNull(); http.expectNone(url); http.expectNone(paradasUrl);
    if (status === 500) expect(componente.errorContexto()).not.toContain('Mensaje del backend');
  });
});
