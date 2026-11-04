import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { authInterceptor } from '../../interceptors/auth.interceptor';
import { API_URL } from '../../services/api.config';
import { AUTH_SESSION_KEY } from '../../services/auth.service';
import { enlaceDocumento, mensajeErrorResolucion } from './resolucion-ant-error';
import { CrearResolucionAntDto, ResolucionAntDto } from './resolucion-ant.model';
import { ResolucionAntService } from './resolucion-ant.service';

describe('ResolucionAntService', () => {
  let servicio: ResolucionAntService;
  let http: HttpTestingController;
  const url = `${API_URL}/resoluciones-ant`;
  const datos: CrearResolucionAntDto = { cooperativaId: 4, numeroResolucion: ' ANT-01 ', fechaResolucion: null, archivoUrl: null };
  const resolucion: ResolucionAntDto = { ...datos, id: 7, activa: false };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    servicio = TestBed.inject(ResolucionAntService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lista activas e inactivas mediante GET sin filtros inventados', () => {
    const recibido = vi.fn(); servicio.listar().subscribe(recibido);
    const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('GET'); expect(peticion.request.params.keys()).toEqual([]);
    peticion.flush([resolucion, { ...resolucion, id: 8, activa: true }]);
    expect(recibido).toHaveBeenCalledWith([resolucion, { ...resolucion, id: 8, activa: true }]);
  });

  it('consulta por GET y mantiene fecha civil sin conversión horaria', () => {
    const recibido = vi.fn(); servicio.obtener(7).subscribe(recibido);
    const peticion = http.expectOne(`${url}/7`); expect(peticion.request.method).toBe('GET');
    peticion.flush({ ...resolucion, fechaResolucion: '2026-11-04' });
    expect(recibido).toHaveBeenCalledWith({ ...resolucion, fechaResolucion: '2026-11-04' });
  });

  it('crea por POST con el contrato literal y opcionales nulos', () => {
    const recibido = vi.fn(); servicio.crear(datos).subscribe(recibido);
    const peticion = http.expectOne(url); expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(datos);
    expect(peticion.request.serializeBody()).toBe(JSON.stringify(datos));
    expect(peticion.request.body).not.toHaveProperty('activa');
    expect(peticion.request.body).not.toHaveProperty('id');
    peticion.flush({ ...resolucion, activa: true }, { status: 201, statusText: 'Created' });
    expect(recibido).toHaveBeenCalledWith({ ...resolucion, activa: true });
  });

  it('actualiza por PUT preservando false, fecha y URL vacía', () => {
    const actualizar = { ...datos, activa: false, fechaResolucion: '2024-02-29', archivoUrl: '' };
    const recibido = vi.fn(); servicio.actualizar(7, actualizar).subscribe(recibido);
    const peticion = http.expectOne(`${url}/7`); expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual(actualizar);
    peticion.flush({ ...actualizar, id: 7 }); expect(recibido).toHaveBeenCalledWith({ ...actualizar, id: 7 });
  });

  it('desactiva por DELETE sin cuerpo y admite 204', () => {
    const completado = vi.fn(); servicio.darDeBaja(7).subscribe({ complete: completado });
    const peticion = http.expectOne(`${url}/7`);
    expect(peticion.request.method).toBe('DELETE'); expect(peticion.request.body).toBeNull();
    peticion.flush(null, { status: 204, statusText: 'No Content' }); expect(completado).toHaveBeenCalledOnce();
  });

  it.each([400, 401, 403, 404, 409, 500])('propaga HTTP %s al consumidor', status => {
    const error = vi.fn(); servicio.crear(datos).subscribe({ error });
    http.expectOne(url).flush({ mensaje: 'Detalle de negocio.' }, { status, statusText: 'Error' });
    expect(error.mock.calls[0][0]).toBeInstanceOf(HttpErrorResponse);
    expect((error.mock.calls[0][0] as HttpErrorResponse).status).toBe(status);
  });

  it('propaga el error de conexión sin producir datos ficticios', () => {
    const error = vi.fn(); const recibido = vi.fn(); servicio.listar().subscribe({ next: recibido, error });
    http.expectOne(url).error(new ProgressEvent('error'));
    expect((error.mock.calls[0][0] as HttpErrorResponse).status).toBe(0); expect(recibido).not.toHaveBeenCalled();
  });

  it('reutiliza el interceptor JWT existente', () => {
    const previa = localStorage.getItem(AUTH_SESSION_KEY);
    try {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ token: 'jwt-exclusivo-de-prueba' }));
      servicio.listar().subscribe();
      const peticion = http.expectOne(url);
      expect(peticion.request.headers.get('Authorization')).toBe('Bearer jwt-exclusivo-de-prueba'); peticion.flush([]);
    } finally {
      if (previa === null) localStorage.removeItem(AUTH_SESSION_KEY); else localStorage.setItem(AUTH_SESSION_KEY, previa);
    }
  });
});

describe('Presentación de errores y documentos ANT', () => {
  it.each([[0, 'conexión'], [400, 'Revisa los datos'], [401, 'sesión'], [403, 'permisos'], [404, 'no está disponible'], [409, 'conflicto'], [500, 'servidor']])(
    'distingue HTTP %s', (estado, texto) => expect(mensajeErrorResolucion(new HttpErrorResponse({ status: Number(estado) }))).toContain(texto)
  );
  it('reutiliza el mensaje de negocio y las validaciones de ASP.NET', () => {
    expect(mensajeErrorResolucion(new HttpErrorResponse({ status: 409, error: { mensaje: 'La resolución ya existe.' } }))).toBe('La resolución ya existe.');
    expect(mensajeErrorResolucion(new HttpErrorResponse({ status: 400, error: { errors: { NumeroResolucion: ['Número inválido.'] } } }))).toBe('Número inválido.');
  });
  it('oculta mensajes técnicos y cuerpos de error del servidor', () => {
    expect(mensajeErrorResolucion(new HttpErrorResponse({ status: 500, error: { mensaje: 'Npgsql stack trace' } }))).not.toContain('Npgsql');
    expect(mensajeErrorResolucion(new Error('SQL privado'))).not.toContain('SQL');
  });
  it.each([null, '', 'javascript:alert(1)', 'data:text/html,hola', 'ftp://example.com/a', '/documento.pdf'])('no enlaza esquemas no admitidos: %s', url => {
    expect(enlaceDocumento(url)).toBeNull();
  });
  it('permite documentos HTTP y HTTPS sin alterar el valor del modelo', () => {
    expect(enlaceDocumento('https://example.com/ant.pdf')).toBe('https://example.com/ant.pdf');
    expect(enlaceDocumento('http://example.com/ant.pdf')).toBe('http://example.com/ant.pdf');
  });
});
