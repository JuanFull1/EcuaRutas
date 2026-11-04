import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { RolUsuario } from '../../models/usuario.model';
import { API_URL } from '../../services/api.config';
import { AuthService } from '../../services/auth.service';
import { LugarDto } from '../lugares/lugar.model';
import { RutaDto } from '../rutas/ruta.model';
import { ParadaFormulario } from './parada-formulario';
import { ParadasLista } from './paradas-lista';
import { CrearRutaParadaDto, RutaParadaDto } from './ruta-parada.model';

describe('ParadasLista', () => {
  const urlRutas = `${API_URL}/rutas`;
  const urlLugares = `${API_URL}/lugares`;
  const url = `${urlRutas}/7/paradas`;
  const urlOtra = `${urlRutas}/8/paradas`;
  const rutas: RutaDto[] = [
    { id: 7, nombre: 'Quito – Cuenca', origenLugarId: 11, destinoLugarId: 22, tipoViaje: 'DIRECTO', activa: true },
    { id: 8, nombre: 'Regreso', origenLugarId: 22, destinoLugarId: 11, tipoViaje: 'CON_PARADAS', activa: false }
  ];
  const lugares: LugarDto[] = [
    { id: 11, nombre: 'Quito', provincia: null, canton: null, tipo: 'CIUDAD', ubicacion: null, activo: true },
    { id: 22, nombre: 'Cuenca', provincia: null, canton: null, tipo: 'TERMINAL', ubicacion: null, activo: true }
  ];
  const datos: CrearRutaParadaDto = {
    lugarId: 11, orden: 0, kmAcumulado: null, minutosAcumulados: null, permiteAscenso: false, permiteDescenso: false
  };
  const parada: RutaParadaDto = { ...datos, id: 101, rutaId: 7 };
  const otra: RutaParadaDto = {
    ...parada, id: 102, lugarId: 22, orden: 10, kmAcumulado: 20.25, minutosAcumulados: 30, permiteAscenso: true
  };
  let http: HttpTestingController;
  let rolActual: RolUsuario | null;
  let fixture: ComponentFixture<ParadasLista>;
  let componente: ParadasLista;

  beforeEach(() => {
    rolActual = 'ADMIN';
    TestBed.configureTestingModule({
      imports: [ParadasLista],
      providers: [provideHttpClient(), provideHttpClientTesting(), {
        provide: AuthService, useValue: { tieneRol: (rol: RolUsuario) => rolActual === rol }
      }]
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ParadasLista);
    componente = fixture.componentInstance;
  });

  afterEach(() => http.verify());

  function iniciar(): void {
    fixture.detectChanges();
    http.expectOne(urlRutas).flush(rutas);
    http.expectOne(urlLugares).flush(lugares);
    fixture.detectChanges();
  }

  function seleccionar(paradas: RutaParadaDto[] = [otra, parada], rutaId = 7): void {
    componente.seleccionarRuta(rutaId);
    http.expectOne(rutaId === 7 ? url : urlOtra).flush(paradas);
    fixture.detectChanges();
  }

  function formulario(): ParadaFormulario {
    return fixture.debugElement.query(By.directive(ParadaFormulario)).componentInstance as ParadaFormulario;
  }

  function botones(): HTMLButtonElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
  }

  function prepararDialogo(): HTMLDialogElement {
    const dialogo = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    // JSDOM no implementa la interacción modal del navegador.
    dialogo.showModal = vi.fn();
    dialogo.close = vi.fn();
    return dialogo;
  }

  it('carga catálogos reales y espera una selección antes de consultar paradas', () => {
    iniciar();
    expect(fixture.nativeElement.textContent).toContain('Selecciona una ruta para consultar sus paradas');
    expect(fixture.nativeElement.textContent).toContain('Regreso');
    expect(fixture.nativeElement.textContent).toContain('Inactiva');
    expect(botones().some(boton => boton.textContent.includes('Agregar parada'))).toBe(false);
    http.expectNone(url);
  });

  it('selecciona una ruta desde el control, conserva su ID y muestra el resumen', () => {
    iniciar();
    const selector = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('#paradas-ruta')!;
    selector.value = '7';
    selector.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(componente.rutaId()).toBe(7);
    expect(fixture.nativeElement.textContent).toContain('Cargando paradas...');
    http.expectOne(url).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Origen');
    expect(fixture.nativeElement.textContent).toContain('Cuenca');
    expect(fixture.nativeElement.textContent).toContain('Esta ruta no tiene paradas registradas');
  });

  it('ordena por Orden sin modificar el array ni los valores recibidos', () => {
    iniciar();
    seleccionar();
    const filas = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(filas[0].querySelector('th')!.textContent.trim()).toBe('0');
    expect(filas[1].querySelector('th')!.textContent.trim()).toBe('10');
    expect(componente.paradas()).toEqual([otra, parada]);
    expect(filas[0].textContent).toContain('Quito');
    expect(filas[1].textContent).toContain('20.25');
    expect(filas[0].textContent).toContain('No permitido');
    expect(filas[1].textContent).toContain('Permitido');
  });

  it('diferencia cero de nulo para ambos acumulados', () => {
    iniciar();
    seleccionar([{ ...parada, kmAcumulado: 0, minutosAcumulados: null }, { ...otra, kmAcumulado: null, minutosAcumulados: 0 }]);
    const filas = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(filas[0].children[2].textContent.trim()).toBe('0');
    expect(filas[0].children[3].textContent.trim()).toBe('Sin dato');
    expect(filas[1].children[2].textContent.trim()).toBe('Sin dato');
    expect(filas[1].children[3].textContent.trim()).toBe('0');
  });

  it('muestra estados de carga y catálogo de rutas vacío', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cargando rutas...');
    http.expectOne(urlRutas).flush([]);
    http.expectOne(urlLugares).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay rutas registradas');
    componente.agregar();
    expect(componente.formularioVisible()).toBe(false);
  });

  it('cancela la consulta anterior y no muestra registros antiguos al cambiar rápidamente', () => {
    iniciar();
    seleccionar();
    componente.cargarParadas();
    const anterior = http.expectOne(url);
    componente.seleccionarRuta(8);
    fixture.detectChanges();
    expect(anterior.cancelled).toBe(true);
    expect(componente.paradas()).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).querySelector('tbody')).toBeNull();
    http.expectOne(urlOtra).flush([{ ...parada, rutaId: 8 }]);
    fixture.detectChanges();
    expect(componente.rutaId()).toBe(8);
    expect(componente.paradas()).toEqual([{ ...parada, rutaId: 8 }]);
    expect(componente.cargando()).toBe(false);
  });

  it('maneja una secuencia A-B-A sin que finalize de una consulta apague la carga siguiente', () => {
    iniciar();
    componente.seleccionarRuta(7);
    const primera = http.expectOne(url);
    componente.seleccionarRuta(8);
    const segunda = http.expectOne(urlOtra);
    componente.seleccionarRuta(7);
    expect(primera.cancelled).toBe(true);
    expect(segunda.cancelled).toBe(true);
    expect(componente.cargando()).toBe(true);
    http.expectOne(url).flush([parada]);
    expect(componente.paradas()).toEqual([parada]);
  });

  it('cancela el detalle de una parada si cambia la ruta antes de recibirlo', () => {
    iniciar();
    seleccionar();
    componente.editar(parada);
    const detalle = http.expectOne(`${url}/101`);
    componente.seleccionarRuta(8);
    expect(detalle.cancelled).toBe(true);
    expect(componente.cargandoDetalle()).toBe(false);
    http.expectOne(urlOtra).flush([]);
    expect(componente.formularioVisible()).toBe(false);
    expect(componente.seleccionada()).toBeNull();
  });

  it('limpia y cancela la consulta al quitar la selección y rechaza IDs ajenos al catálogo', () => {
    iniciar();
    componente.seleccionarRuta(999);
    expect(componente.rutaId()).toBeNull();
    componente.seleccionarRuta(7);
    const pendiente = http.expectOne(url);
    componente.seleccionarRuta(null);
    expect(pendiente.cancelled).toBe(true);
    expect(componente.paradas()).toEqual([]);
    expect(componente.rutaSeleccionada()).toBeNull();
  });

  it('evita consultas duplicadas y permite recargar las paradas', () => {
    iniciar();
    componente.seleccionarRuta(7);
    componente.seleccionarRuta(7);
    componente.cargarParadas();
    http.expectOne(url).flush([parada]);
    componente.cargarParadas();
    http.expectOne(url).flush([otra]);
    expect(componente.paradas()).toEqual([otra]);
  });

  it('actualiza los catálogos y borra la selección si la ruta deja de existir', () => {
    iniciar();
    seleccionar();
    componente.actualizar();
    http.expectOne(urlRutas).flush([rutas[1]]);
    http.expectOne(urlLugares).flush(lugares);
    expect(componente.rutaId()).toBeNull();
    expect(componente.paradas()).toEqual([]);
    http.expectNone(url);
  });

  it('permite reintentar el catálogo de rutas tras un error de servidor', () => {
    fixture.detectChanges();
    http.expectOne(urlRutas).flush(null, { status: 500, statusText: 'Server Error' });
    http.expectOne(urlLugares).flush(lugares);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se pudo actualizar el catálogo de rutas');
    componente.cargarRutas();
    http.expectOne(urlRutas).flush(rutas);
    expect(componente.errorRutas()).toBeNull();
  });

  it('mantiene las paradas consultables si falla el catálogo de lugares y permite reintentarlo', () => {
    fixture.detectChanges();
    http.expectOne(urlRutas).flush(rutas);
    http.expectOne(urlLugares).error(new ProgressEvent('error'));
    seleccionar([parada]);
    expect(fixture.nativeElement.textContent).toContain('Lugar #11 (nombre no disponible)');
    componente.agregar();
    componente.guardar({ modo: 'crear', rutaId: 7, datos });
    http.expectNone(url);
    componente.cargarLugares();
    http.expectOne(urlLugares).flush(lugares);
    expect(componente.errorLugares()).toBeNull();
  });

  it.each([
    [400, 'Revisa los datos'], [401, 'sesión'], [403, 'permisos'], [404, 'no está disponible'],
    [409, 'conflicto'], [500, 'servidor'], [418, 'inesperada']
  ])('muestra un error diferenciado para HTTP %s al consultar paradas', (status, mensaje) => {
    iniciar();
    componente.seleccionarRuta(7);
    http.expectOne(url).flush(null, { status: Number(status), statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(mensaje);
    expect(componente.cargando()).toBe(false);
    expect(componente.paradasConsultadas()).toBe(false);
    componente.agregar();
    expect(componente.formularioVisible()).toBe(false);
  });

  it('recupera las paradas tras un error de conexión sin mostrar un falso estado vacío', () => {
    iniciar();
    componente.seleccionarRuta(7);
    http.expectOne(url).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Verifica tu conexión');
    expect(fixture.nativeElement.textContent).not.toContain('Esta ruta no tiene paradas');
    componente.cargarParadas();
    http.expectOne(url).flush([]);
    expect(componente.error()).toBeNull();
    expect(componente.paradasConsultadas()).toBe(true);
  });

  it.each(['COOPERATIVA', 'OFICINISTA', 'CLIENTE', 'BUS', null] as const)('oculta acciones y bloquea escrituras para el rol %s', rol => {
    rolActual = rol;
    iniciar();
    seleccionar();
    expect(botones().some(boton => /Agregar parada|Editar|Eliminar/.test(boton.textContent))).toBe(false);
    componente.agregar();
    componente.editar(parada);
    componente.solicitarEliminar(parada);
    componente.guardar({ modo: 'crear', rutaId: 7, datos });
    expect(componente.formularioVisible()).toBe(false);
    expect(componente.pendienteEliminar()).toBeNull();
    http.expectNone(url);
    http.expectNone(`${url}/101`);
  });

  it('crea desde el formulario, bloquea doble envío y refresca manteniendo la ruta', () => {
    iniciar();
    seleccionar([]);
    botones().find(boton => boton.textContent.includes('Agregar parada'))!.click();
    fixture.detectChanges();
    formulario().form.patchValue(datos);
    const form = (fixture.nativeElement as HTMLElement).querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(datos);
    componente.seleccionarRuta(8);
    expect(componente.rutaId()).toBe(7);
    peticion.flush(parada, { status: 201, statusText: 'Created' });
    http.expectOne(url).flush([parada]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Parada agregada correctamente');
    expect(componente.rutaId()).toBe(7);
    expect(componente.formularioVisible()).toBe(false);
  });

  it('permite gestionar paradas de rutas inactivas conforme al servicio backend', () => {
    iniciar();
    seleccionar([], 8);
    componente.agregar();
    componente.guardar({ modo: 'crear', rutaId: 8, datos });
    const peticion = http.expectOne(urlOtra);
    expect(peticion.request.method).toBe('POST');
    peticion.flush({ ...parada, rutaId: 8 });
    http.expectOne(urlOtra).flush([{ ...parada, rutaId: 8 }]);
    expect(componente.rutaId()).toBe(8);
  });

  it('consulta el detalle y actualiza por PUT conservando IDs, nulos y false', () => {
    iniciar();
    seleccionar();
    componente.editar(parada);
    http.expectOne(`${url}/101`).flush({ ...parada, orden: 5 });
    fixture.detectChanges();
    expect(formulario().form.controls.orden.value).toBe(5);
    formulario().guardar();
    const peticion = http.expectOne(`${url}/101`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({ ...datos, orden: 5 });
    peticion.flush({ ...parada, orden: 5 });
    http.expectOne(url).flush([{ ...parada, orden: 5 }, otra]);
    expect(componente.exito()).toBe('Parada actualizada correctamente.');
  });

  it('bloquea la edición de otra ruta y rechaza respuestas de detalle incoherentes', () => {
    iniciar();
    seleccionar();
    componente.editar({ ...parada, rutaId: 8 });
    http.expectNone(`${urlOtra}/101`);
    componente.editar(parada);
    http.expectOne(`${url}/101`).flush({ ...parada, rutaId: 8 });
    expect(componente.formularioVisible()).toBe(false);
    expect(componente.error()).toContain('no corresponden');
  });

  it('muestra 404 al editar una parada desaparecida sin abrir creación', () => {
    iniciar();
    seleccionar();
    componente.editar(parada);
    http.expectOne(`${url}/101`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(componente.formularioVisible()).toBe(false);
    expect(componente.error()).toContain('no está disponible');
  });

  it('no convierte una edición en POST ni permite guardar con IDs distintos', () => {
    iniciar();
    seleccionar();
    componente.editar(parada);
    http.expectOne(`${url}/101`).flush(parada);
    componente.guardar({ modo: 'crear', rutaId: 7, datos });
    componente.guardar({ modo: 'editar', rutaId: 8, id: 101, datos });
    componente.guardar({ modo: 'editar', rutaId: 7, id: 999, datos });
    http.expectNone(url);
    http.expectNone(`${urlOtra}/101`);
    http.expectNone(`${url}/999`);
  });

  it('muestra errores de validación y permite corregir sin perder el formulario', () => {
    iniciar();
    seleccionar([]);
    componente.agregar();
    fixture.detectChanges();
    formulario().form.patchValue(datos);
    formulario().guardar();
    http.expectOne(url).flush({ errors: { Orden: ['El orden no es válido.'] } }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('El orden no es válido.');
    expect(formulario().form.controls.orden.value).toBe(0);
    expect(componente.formularioVisible()).toBe(true);
    expect(componente.guardando()).toBe(false);
  });

  it('conserva datos al recibir un conflicto de referencias operativas y permite reintentar', () => {
    iniciar();
    seleccionar();
    componente.editar(parada);
    http.expectOne(`${url}/101`).flush(parada);
    fixture.detectChanges();
    formulario().form.controls.orden.setValue(5);
    formulario().guardar();
    const mensaje = 'No se puede modificar una parada referenciada por tarifas o ventas.';
    http.expectOne(`${url}/101`).flush({ mensaje }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(mensaje);
    expect(formulario().form.controls.orden.value).toBe(5);
    formulario().guardar();
    http.expectOne(`${url}/101`).flush({ ...parada, orden: 5 });
    http.expectOne(url).flush([{ ...parada, orden: 5 }]);
  });

  it('bloquea el guardado si se pierde el permiso y permite cancelar', () => {
    iniciar();
    seleccionar([]);
    componente.agregar();
    rolActual = 'CLIENTE';
    componente.guardar({ modo: 'crear', rutaId: 7, datos });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('La escritura requiere una sesión vigente con rol ADMIN');
    componente.cerrarFormulario();
    expect(componente.formularioVisible()).toBe(false);
    http.expectNone(url);
  });

  it('confirma la eliminación física mostrando orden, lugar y ruta y permite cancelar', () => {
    iniciar();
    seleccionar();
    const dialogo = prepararDialogo();
    componente.solicitarEliminar(parada);
    fixture.detectChanges();
    expect(dialogo.showModal).toHaveBeenCalledOnce();
    expect(dialogo.textContent).toContain('se eliminará físicamente');
    expect(dialogo.textContent).toContain('Quito');
    expect(dialogo.textContent).toContain('Quito – Cuenca');
    http.expectNone(`${url}/101`);
    componente.cancelarEliminar();
    expect(dialogo.close).toHaveBeenCalledOnce();
    expect(componente.pendienteEliminar()).toBeNull();
  });

  it('espera el DELETE, bloquea duplicados y cambios de ruta y recarga tras 204', () => {
    iniciar();
    seleccionar();
    prepararDialogo();
    componente.solicitarEliminar(parada);
    componente.confirmarEliminar();
    componente.confirmarEliminar();
    componente.seleccionarRuta(8);
    const evento = new Event('cancel', { cancelable: true });
    componente.cancelarEliminar(evento);
    expect(evento.defaultPrevented).toBe(true);
    expect(componente.paradas()).toEqual([otra, parada]);
    expect(componente.rutaId()).toBe(7);
    const peticion = http.expectOne(`${url}/101`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(url).flush([otra]);
    expect(componente.paradas()).toEqual([otra]);
    expect(componente.exito()).toBe('Parada eliminada correctamente.');
  });

  it('muestra conflictos de eliminación sin quitar registros y permite reintentar', () => {
    iniciar();
    seleccionar();
    prepararDialogo();
    componente.solicitarEliminar(parada);
    componente.confirmarEliminar();
    http.expectOne(`${url}/101`).flush({ mensaje: 'La parada está referenciada por ventas.' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('La parada está referenciada por ventas.');
    expect(componente.paradas()).toEqual([otra, parada]);
    expect(componente.eliminando()).toBe(false);
    componente.confirmarEliminar();
    http.expectOne(`${url}/101`).flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(url).flush([otra]);
  });

  it('revalida ADMIN al confirmar y rechaza eliminar una parada de otra ruta', () => {
    iniciar();
    seleccionar();
    prepararDialogo();
    componente.solicitarEliminar({ ...parada, rutaId: 8 });
    expect(componente.pendienteEliminar()).toBeNull();
    componente.solicitarEliminar(parada);
    rolActual = 'CLIENTE';
    componente.confirmarEliminar();
    expect(componente.errorEliminar()).toContain('ADMIN');
    http.expectNone(`${url}/101`);
  });

  it('cancela todas las consultas pendientes cuando se destruye el componente', () => {
    fixture.detectChanges();
    const pendientesRutas = http.expectOne(urlRutas);
    const pendientesLugares = http.expectOne(urlLugares);
    fixture.destroy();
    expect(pendientesRutas.cancelled).toBe(true);
    expect(pendientesLugares.cancelled).toBe(true);
  });
});
