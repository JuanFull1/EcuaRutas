import { provideRouter } from '@angular/router';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../../services/auth.service';
import { API_URL } from '../../services/api.config';
import { mensajeErrorLugar } from './lugar-error';
import { LugarFormulario } from './lugar-formulario';
import { LugarDto } from './lugar.model';
import { LugaresLista } from './lugares-lista';

const lugar: LugarDto = {
  id: 7, nombre: 'Quito', provincia: 'Pichincha', canton: null,
  tipo: 'CIUDAD', ubicacion: { latitud: 0, longitud: -78.5123456789 }, activo: false
};

describe('Formulario de lugares', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [LugarFormulario] }));

  function crearFormulario(edicion = false) {
    const fixture = TestBed.createComponent(LugarFormulario);
    fixture.componentRef.setInput('autorizado', true);
    if (edicion) fixture.componentRef.setInput('lugar', lugar);
    fixture.detectChanges();
    return fixture;
  }

  it('rechaza nombres en blanco, tipos inválidos y longitudes superiores al contrato', () => {
    const componente = crearFormulario().componentInstance;
    componente.form.patchValue({ nombre: '   ', tipo: 'CIUDAD' });
    expect(componente.form.invalid).toBe(true);
    componente.form.patchValue({ nombre: 'Q'.repeat(151), provincia: 'P'.repeat(101), canton: 'C'.repeat(101) });
    expect(componente.form.controls.nombre.invalid).toBe(true);
    expect(componente.form.controls.provincia.invalid).toBe(true);
    expect(componente.form.controls.canton.invalid).toBe(true);
    componente.form.controls.tipo.setValue('OTRO' as 'CIUDAD');
    expect(componente.form.controls.tipo.invalid).toBe(true);
  });

  it('crea sin ubicación y sin enviar activo ni identificador', () => {
    const componente = crearFormulario().componentInstance;
    const emitir = vi.spyOn(componente.guardarLugar, 'emit');
    componente.form.patchValue({ nombre: ' Quito ', tipo: 'CIUDAD' });
    componente.guardar();
    expect(emitir).toHaveBeenCalledExactlyOnceWith({
      modo: 'crear', datos: { nombre: 'Quito', provincia: null, canton: null, tipo: 'CIUDAD', ubicacion: null }
    });
  });

  it('valida las coordenadas como par opcional, finito y dentro de los límites WGS84', () => {
    const componente = crearFormulario().componentInstance;
    componente.form.patchValue({ nombre: 'Quito', tipo: 'CIUDAD', latitud: 0 });
    expect(componente.form.hasError('coordenadasIncompletas')).toBe(true);
    componente.form.patchValue({ latitud: -90, longitud: 180 });
    expect(componente.form.valid).toBe(true);
    componente.form.patchValue({ latitud: 90, longitud: -180 });
    expect(componente.form.valid).toBe(true);
    componente.form.patchValue({ latitud: 90.001, longitud: -180.001 });
    expect(componente.form.controls.latitud.invalid).toBe(true);
    expect(componente.form.controls.longitud.invalid).toBe(true);
    componente.form.patchValue({ latitud: Number.NaN, longitud: Infinity });
    expect(componente.form.invalid).toBe(true);
  });

  it('precarga cero y false sin perder precisión y permite limpiar ambas coordenadas', () => {
    const componente = crearFormulario(true).componentInstance;
    expect(componente.form.getRawValue()).toMatchObject({ latitud: 0, longitud: -78.5123456789, activo: false });
    const emitir = vi.spyOn(componente.guardarLugar, 'emit');
    componente.form.patchValue({ latitud: null, longitud: null });
    componente.guardar();
    expect(emitir).toHaveBeenCalledExactlyOnceWith({
      modo: 'editar', id: 7,
      datos: { nombre: 'Quito', provincia: 'Pichincha', canton: null, tipo: 'CIUDAD', ubicacion: null, activo: false }
    });
  });

  it('impide emitir formularios inválidos, envíos en progreso y envíos sin autorización', () => {
    const fixture = crearFormulario();
    const componente = fixture.componentInstance;
    const emitir = vi.spyOn(componente.guardarLugar, 'emit');
    componente.guardar();
    expect(componente.form.controls.nombre.touched).toBe(true);
    componente.form.patchValue({ nombre: 'Quito', tipo: 'CIUDAD' });
    fixture.componentRef.setInput('guardando', true);
    componente.guardar();
    fixture.componentRef.setInput('guardando', false);
    fixture.componentRef.setInput('autorizado', false);
    componente.guardar();
    expect(emitir).not.toHaveBeenCalled();
  });
});

describe('Gestión de lugares y contrato HTTP', () => {
  let http: HttpTestingController;
  let autorizado: boolean;

  beforeEach(() => {
    autorizado = true;
    TestBed.configureTestingModule({
      imports: [LugaresLista],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), {
        provide: AuthService,
        useValue: { tieneRol: (rol: string) => autorizado && rol === 'ADMIN' }
      }]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function crearListado(datos: LugarDto[] = [lugar]) {
    const fixture = TestBed.createComponent(LugaresLista);
    fixture.detectChanges();
    http.expectOne(`${API_URL}/lugares`).flush(datos);
    fixture.detectChanges();
    return fixture;
  }

  it('distingue carga, listado vacío y búsqueda sin coincidencias sin consultar de nuevo', () => {
    const fixture = TestBed.createComponent(LugaresLista);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cargando lugares');
    http.expectOne(`${API_URL}/lugares`).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay lugares registrados');
    fixture.componentInstance.cargar();
    http.expectOne(`${API_URL}/lugares`).flush([lugar]);
    fixture.componentInstance.busqueda.set('guayaquil');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay lugares que coincidan');
    http.expectNone(`${API_URL}/lugares`);
  });

  it('busca por nombre y mantiene visibles los inactivos con filtro Todos', () => {
    const componente = crearListado().componentInstance;
    componente.busqueda.set(' QUITo ');
    expect(componente.lugaresFiltrados()).toEqual([lugar]);
    componente.filtroEstado.set('activo');
    expect(componente.lugaresFiltrados()).toEqual([]);
    componente.filtroEstado.set('inactivo');
    expect(componente.lugaresFiltrados()).toEqual([lugar]);
  });

  it('obtiene el detalle y envía PUT con false y ubicación null; bloquea envíos duplicados', () => {
    const componente = crearListado().componentInstance;
    componente.editar(lugar);
    http.expectOne(`${API_URL}/lugares/7`).flush(lugar);
    const { id, ...datos } = { ...lugar, ubicacion: null };
    const evento = { modo: 'editar' as const, id, datos };
    componente.guardar(evento);
    componente.guardar(evento);
    const peticion = http.expectOne(`${API_URL}/lugares/7`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual(datos);
    peticion.flush({ ...lugar, ubicacion: null });
    http.expectOne(`${API_URL}/lugares`).flush([{ ...lugar, ubicacion: null }]);
    expect(componente.exito()).toContain('actualizado');
    expect(componente.formularioVisible()).toBe(false);
  });

  it('envía POST al crear y conserva el formulario ante errores de validación', () => {
    const componente = crearListado().componentInstance;
    componente.nuevo();
    const datos = { nombre: 'Quito', tipo: 'CIUDAD' as const, provincia: null, canton: null, ubicacion: null };
    componente.guardar({ modo: 'crear', datos });
    const peticion = http.expectOne(`${API_URL}/lugares`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(datos);
    peticion.flush({ errors: { Nombre: ['Nombre inválido.'] } }, { status: 400, statusText: 'Bad Request' });
    expect(componente.errorFormulario()).toBe('Nombre inválido.');
    expect(componente.formularioVisible()).toBe(true);
    expect(componente.guardando()).toBe(false);
  });

  it('oculta las acciones y bloquea escrituras para usuarios sin rol ADMIN', () => {
    autorizado = false;
    const fixture = crearListado();
    const componente = fixture.componentInstance;
    const botones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.container-fluid button')).map(b => b.textContent);
    expect(botones.join(' ')).not.toMatch(/Nuevo lugar|Editar|Desactivar/);
    componente.nuevo();
    componente.editar(lugar);
    componente.solicitarBaja({ ...lugar, activo: true });
    expect(componente.formularioVisible()).toBe(false);
    http.expectNone(`${API_URL}/lugares/7`);
  });

  it('rechaza convertir una edición en creación y bloquea el guardado si se pierde el permiso', () => {
    const componente = crearListado().componentInstance;
    componente.editar(lugar);
    http.expectOne(`${API_URL}/lugares/7`).flush(lugar);
    const { id, ...datos } = lugar;
    componente.guardar({ modo: 'crear', datos });
    http.expectNone(`${API_URL}/lugares`);
    autorizado = false;
    componente.guardar({ modo: 'editar', id, datos });
    http.expectNone(`${API_URL}/lugares/7`);
  });

  it('solo envía DELETE después de confirmar, muestra conflictos y refresca al desactivar', () => {
    const fixture = crearListado([{ ...lugar, activo: true }]);
    const componente = fixture.componentInstance;
    const dialogo = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    // JSDOM no implementa la interacción modal del navegador.
    dialogo.showModal = vi.fn();
    dialogo.close = vi.fn();
    componente.solicitarBaja({ ...lugar, activo: true });
    http.expectNone(`${API_URL}/lugares/7`);
    componente.confirmarBaja();
    componente.confirmarBaja();
    const conflicto = http.expectOne(`${API_URL}/lugares/7`);
    expect(conflicto.request.method).toBe('DELETE');
    conflicto.flush({ mensaje: 'El lugar está en uso.' }, { status: 409, statusText: 'Conflict' });
    expect(componente.errorBaja()).toBe('El lugar está en uso.');
    componente.confirmarBaja();
    http.expectOne(`${API_URL}/lugares/7`).flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(`${API_URL}/lugares`).flush([lugar]);
    expect(componente.lugaresFiltrados()[0].activo).toBe(false);
    expect(componente.exito()).toContain('desactivado');
  });

  it('permite reintentar tras un error de conexión sin inventar registros', () => {
    const fixture = TestBed.createComponent(LugaresLista);
    fixture.detectChanges();
    http.expectOne(`${API_URL}/lugares`).error(new ProgressEvent('error'));
    expect(fixture.componentInstance.error()).toContain('conexión');
    expect(fixture.componentInstance.cargando()).toBe(false);
    expect(fixture.componentInstance.lugares()).toEqual([]);
    fixture.componentInstance.cargar();
    http.expectOne(`${API_URL}/lugares`).flush([lugar]);
    expect(fixture.componentInstance.error()).toBeNull();
  });
});

describe('Errores de lugares', () => {
  it.each([
    [400, 'Revisa los datos'], [401, 'sesión'], [403, 'permisos'], [404, 'no está disponible'],
    [409, 'conflicto'], [500, 'servidor'], [418, 'inesperada']
  ])('distingue HTTP %s', (status, texto) => {
    expect(mensajeErrorLugar(new HttpErrorResponse({ status: Number(status) }))).toContain(texto);
  });
});
