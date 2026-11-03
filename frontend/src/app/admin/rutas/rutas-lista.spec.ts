import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { RolUsuario } from '../../models/usuario.model';
import { API_URL } from '../../services/api.config';
import { AuthService } from '../../services/auth.service';
import { LugarDto } from '../lugares/lugar.model';
import { RutaFormulario } from './ruta-formulario';
import { CrearRutaDto, RutaDto } from './ruta.model';
import { RutasLista } from './rutas-lista';

describe('RutasLista', () => {
  const url = `${API_URL}/rutas`;
  const urlLugares = `${API_URL}/lugares`;
  const lugares: LugarDto[] = [
    { id: 11, nombre: 'Quito', provincia: null, canton: null, tipo: 'CIUDAD', ubicacion: null, activo: true },
    { id: 22, nombre: 'Cuenca', provincia: null, canton: null, tipo: 'TERMINAL', ubicacion: null, activo: true }
  ];
  const datos: CrearRutaDto = { nombre: 'Quito – Cuenca', origenLugarId: 11, destinoLugarId: 22, tipoViaje: 'DIRECTO' };
  const ruta: RutaDto = { ...datos, id: 7, activa: true };
  const inactiva: RutaDto = { ...ruta, id: 8, nombre: 'Regreso', origenLugarId: 22, destinoLugarId: 11, activa: false };
  let http: HttpTestingController;
  let rolActual: RolUsuario | null;
  let fixture: ComponentFixture<RutasLista>;
  let componente: RutasLista;

  beforeEach(() => {
    rolActual = 'ADMIN';
    TestBed.configureTestingModule({
      imports: [RutasLista],
      providers: [provideHttpClient(), provideHttpClientTesting(), {
        provide: AuthService, useValue: { tieneRol: (rol: RolUsuario) => rolActual === rol }
      }]
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RutasLista);
    componente = fixture.componentInstance;
  });

  afterEach(() => http.verify());

  function responderListado(rutas: RutaDto[] = [ruta, inactiva]): void {
    http.expectOne(url).flush(rutas);
    http.expectOne(urlLugares).flush(lugares);
    fixture.detectChanges();
  }

  function iniciar(rutas: RutaDto[] = [ruta, inactiva]): void {
    fixture.detectChanges();
    responderListado(rutas);
  }

  function botones(): HTMLButtonElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
  }

  function prepararDialogo(): HTMLDialogElement {
    const dialogo = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    // La interacción modal nativa se sustituye porque JSDOM no la implementa.
    dialogo.showModal = vi.fn();
    dialogo.close = vi.fn();
    return dialogo;
  }

  it('renderiza registros, nombres de lugares, tipos y estados', () => {
    iniciar();
    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(elemento.textContent).toContain('Quito – Cuenca');
    expect(elemento.textContent).toContain('Cuenca');
    expect(elemento.textContent).toContain('Directo');
    expect(elemento.textContent).toContain('Activa');
    expect(elemento.textContent).toContain('Inactiva');
    expect(botones().filter(boton => boton.getAttribute('aria-label')?.startsWith('Desactivar'))).toHaveLength(1);
  });

  it('busca y filtra localmente mediante los controles sin duplicar solicitudes', () => {
    iniciar();
    const elemento = fixture.nativeElement as HTMLElement;
    const buscar = elemento.querySelector<HTMLInputElement>('#buscar-ruta')!;
    buscar.value = ' QUITO ';
    buscar.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(elemento.querySelectorAll('tbody tr')).toHaveLength(1);
    const estado = elemento.querySelector<HTMLSelectElement>('#estado-ruta')!;
    estado.value = 'inactiva';
    estado.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(elemento.textContent).toContain('No hay rutas que coincidan');
    componente.limpiarFiltros();
    componente.filtroEstado.set('inactiva');
    fixture.detectChanges();
    expect(elemento.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(componente.rutasFiltradas()).toEqual([inactiva]);
    http.expectNone(url);
  });

  it('distingue cargando y listado sin registros', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cargando rutas...');
    responderListado([]);
    expect(fixture.nativeElement.textContent).toContain('No hay rutas registradas.');
    expect(fixture.nativeElement.textContent).not.toContain('No hay rutas que coincidan');
  });

  it('permite actualizar manualmente y bloquea consultas simultáneas del mismo catálogo', () => {
    iniciar();
    componente.cargar();
    componente.cargar();
    componente.cargarLugares();
    responderListado([ruta]);
    expect(componente.rutas()).toEqual([ruta]);
  });

  it('muestra y permite reintentar los errores de conexión', () => {
    fixture.detectChanges();
    http.expectOne(url).error(new ProgressEvent('error'));
    http.expectOne(urlLugares).flush(lugares);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Verifica tu conexión');
    expect(componente.rutas()).toEqual([]);
    expect(componente.cargando()).toBe(false);
    componente.cargar();
    responderListado();
    expect(componente.error()).toBeNull();
  });

  it.each([
    [400, 'Revisa los datos'], [401, 'sesión'], [403, 'permisos'],
    [404, 'no está disponible'], [409, 'conflicto'], [500, 'servidor'], [418, 'inesperada']
  ])('presenta un mensaje comprensible para HTTP %s', (status, mensaje) => {
    fixture.detectChanges();
    http.expectOne(url).flush(null, { status: Number(status), statusText: 'Error' });
    http.expectOne(urlLugares).flush(lugares);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(mensaje);
    expect(componente.cargando()).toBe(false);
  });

  it('conserva los últimos datos con aviso si falla una actualización', () => {
    iniciar();
    componente.cargar();
    http.expectOne(url).flush(null, { status: 500, statusText: 'Server Error' });
    http.expectOne(urlLugares).flush(lugares);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('podrían estar desactualizados');
    expect(componente.rutas()).toEqual([ruta, inactiva]);
  });

  it('un fallo de lugares conserva las rutas y sus IDs y permite recuperar el catálogo', () => {
    fixture.detectChanges();
    http.expectOne(url).flush([ruta]);
    http.expectOne(urlLugares).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Lugar #11 (nombre no disponible)');
    componente.nueva();
    fixture.detectChanges();
    const formulario = fixture.debugElement.query(By.directive(RutaFormulario)).componentInstance as RutaFormulario;
    formulario.form.patchValue(datos);
    formulario.guardar();
    http.expectNone(url);
    componente.cargarLugares();
    http.expectOne(urlLugares).flush(lugares);
    fixture.detectChanges();
    expect(componente.errorLugares()).toBeNull();
    expect(formulario.form.valid).toBe(true);
  });

  it('identifica los lugares inactivos y no descarta las rutas que los referencian', () => {
    fixture.detectChanges();
    http.expectOne(url).flush([ruta]);
    http.expectOne(urlLugares).flush([{ ...lugares[0], activo: false }, lugares[1]]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Lugar inactivo');
    expect(componente.rutasFiltradas()).toEqual([ruta]);
  });

  it.each(['COOPERATIVA', 'OFICINISTA', 'CLIENTE', 'BUS', null] as const)('oculta acciones y bloquea escritura para el rol %s', rol => {
    rolActual = rol;
    iniciar();
    expect(botones().some(boton => /Nueva ruta|Editar|Desactivar/.test(boton.textContent))).toBe(false);
    componente.nueva();
    componente.editar(ruta);
    componente.solicitarBaja(ruta);
    componente.guardar({ modo: 'crear', datos });
    expect(componente.formularioVisible()).toBe(false);
    expect(componente.pendienteBaja()).toBeNull();
    http.expectNone(url);
    http.expectNone(`${url}/7`);
  });

  it('crea desde el formulario real, evita solicitudes duplicadas y refresca tras 201', () => {
    iniciar([]);
    botones().find(boton => boton.textContent.includes('Nueva ruta'))!.click();
    fixture.detectChanges();
    const formulario = fixture.debugElement.query(By.directive(RutaFormulario)).componentInstance as RutaFormulario;
    formulario.form.patchValue(datos);
    const form = (fixture.nativeElement as HTMLElement).querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(datos);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Guardando...');
    peticion.flush(ruta, { status: 201, statusText: 'Created' });
    responderListado([ruta]);
    expect(fixture.nativeElement.textContent).toContain('Ruta creada correctamente.');
    expect(fixture.nativeElement.querySelector('app-ruta-formulario')).toBeNull();
  });

  it('consulta detalles reales y actualiza por PUT conservando el ID y activa false', () => {
    iniciar();
    componente.editar(inactiva);
    http.expectOne(`${url}/8`).flush({ ...inactiva, nombre: 'Detalle actualizado' });
    fixture.detectChanges();
    const formulario = fixture.debugElement.query(By.directive(RutaFormulario)).componentInstance as RutaFormulario;
    expect(formulario.form.controls.nombre.value).toBe('Detalle actualizado');
    formulario.guardar();
    const peticion = http.expectOne(`${url}/8`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body.activa).toBe(false);
    expect(peticion.request.body.id).toBeUndefined();
    peticion.flush({ ...inactiva, nombre: 'Detalle actualizado' });
    responderListado([{ ...inactiva, nombre: 'Detalle actualizado' }]);
    expect(componente.exito()).toBe('Ruta actualizada correctamente.');
  });

  it('no convierte edición en creación ni envía una actualización con otro ID', () => {
    iniciar();
    componente.editar(ruta);
    http.expectOne(`${url}/7`).flush(ruta);
    componente.guardar({ modo: 'crear', datos });
    componente.guardar({ modo: 'editar', id: 99, datos: ruta });
    http.expectNone(url);
    http.expectNone(`${url}/99`);
  });

  it('muestra 404 al editar una ruta desaparecida sin abrir un formulario de creación', () => {
    iniciar();
    componente.editar(ruta);
    http.expectOne(`${url}/7`).flush(null, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(componente.formularioVisible()).toBe(false);
    expect(componente.cargandoDetalle()).toBe(false);
    expect(componente.error()).toContain('no está disponible');
  });

  it('mantiene el formulario y los datos ante un conflicto operativo y permite corregir', () => {
    iniciar();
    componente.editar(ruta);
    http.expectOne(`${url}/7`).flush(ruta);
    fixture.detectChanges();
    const formulario = fixture.debugElement.query(By.directive(RutaFormulario)).componentInstance as RutaFormulario;
    formulario.form.controls.tipoViaje.setValue('CON_PARADAS');
    formulario.guardar();
    const mensaje = 'No se pueden cambiar el origen, destino o tipo de una ruta con referencias operativas.';
    http.expectOne(`${url}/7`).flush({ mensaje }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(mensaje);
    expect(formulario.form.controls.tipoViaje.value).toBe('CON_PARADAS');
    expect(componente.formularioVisible()).toBe(true);
    expect(componente.guardando()).toBe(false);
    formulario.form.controls.tipoViaje.setValue('DIRECTO');
    formulario.guardar();
    http.expectOne(`${url}/7`).flush(ruta);
    responderListado();
  });

  it('muestra los errores de validación del backend sin cerrar el formulario', () => {
    iniciar();
    componente.nueva();
    componente.guardar({ modo: 'crear', datos });
    http.expectOne(url).flush({ errors: { Nombre: ['Nombre inválido.'] } }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nombre inválido.');
    expect(componente.formularioVisible()).toBe(true);
  });

  it('revalida ADMIN antes del guardado aunque el formulario ya estuviera abierto', () => {
    iniciar();
    componente.nueva();
    rolActual = 'CLIENTE';
    componente.guardar({ modo: 'crear', datos });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('La escritura requiere una sesión vigente con rol ADMIN');
    http.expectNone(url);
  });

  it('cancela el formulario sin enviar solicitudes', () => {
    iniciar();
    componente.nueva();
    componente.cerrarFormulario();
    expect(componente.formularioVisible()).toBe(false);
    http.expectNone(url);
  });

  it('solicita confirmación antes de DELETE y permite cancelar sin mutaciones', () => {
    iniciar();
    const dialogo = prepararDialogo();
    componente.solicitarBaja(ruta);
    fixture.detectChanges();
    expect(dialogo.showModal).toHaveBeenCalledOnce();
    expect(dialogo.textContent).toContain('La ruta quedará inactiva');
    http.expectNone(`${url}/7`);
    componente.cancelarBaja();
    expect(dialogo.close).toHaveBeenCalledOnce();
    expect(componente.pendienteBaja()).toBeNull();
  });

  it('desactiva por DELETE, bloquea duplicados y conserva la ruta inactiva tras refrescar', () => {
    iniciar([ruta]);
    prepararDialogo();
    componente.solicitarBaja(ruta);
    componente.confirmarBaja();
    componente.confirmarBaja();
    const evento = new Event('cancel', { cancelable: true });
    componente.cancelarBaja(evento);
    expect(evento.defaultPrevented).toBe(true);
    expect(componente.pendienteBaja()).toEqual(ruta);
    const peticion = http.expectOne(`${url}/7`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null, { status: 204, statusText: 'No Content' });
    responderListado([{ ...ruta, activa: false }]);
    expect(componente.rutasFiltradas()).toEqual([{ ...ruta, activa: false }]);
    expect(componente.exito()).toBe('Ruta desactivada correctamente.');
  });

  it('muestra el conflicto de baja y permite reintentar sin perder la ruta seleccionada', () => {
    iniciar();
    prepararDialogo();
    componente.solicitarBaja(ruta);
    componente.confirmarBaja();
    http.expectOne(`${url}/7`).flush({ mensaje: 'La ruta tiene dependencias operativas.' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('La ruta tiene dependencias operativas.');
    expect(componente.desactivando()).toBe(false);
    expect(componente.pendienteBaja()).toEqual(ruta);
    componente.confirmarBaja();
    http.expectOne(`${url}/7`).flush(null, { status: 204, statusText: 'No Content' });
    responderListado();
  });

  it('no desactiva rutas ya inactivas ni ejecuta la baja si se pierde el permiso', () => {
    iniciar();
    prepararDialogo();
    componente.solicitarBaja(inactiva);
    expect(componente.pendienteBaja()).toBeNull();
    componente.solicitarBaja(ruta);
    rolActual = 'CLIENTE';
    componente.confirmarBaja();
    expect(componente.errorBaja()).toContain('ADMIN');
    http.expectNone(`${url}/7`);
  });

  it('cancela las consultas pendientes al destruir el componente', () => {
    fixture.detectChanges();
    const rutasPendientes = http.expectOne(url);
    const lugaresPendientes = http.expectOne(urlLugares);
    fixture.destroy();
    expect(rutasPendientes.cancelled).toBe(true);
    expect(lugaresPendientes.cancelled).toBe(true);
  });
});
