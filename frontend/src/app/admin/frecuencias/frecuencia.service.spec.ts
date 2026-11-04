import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { authInterceptor } from '../../interceptors/auth.interceptor';
import { API_URL } from '../../services/api.config';
import { AUTH_SESSION_KEY } from '../../services/auth.service';
import { mensajeErrorFrecuencia } from './frecuencia-error';
import { CrearFrecuenciaDto, FrecuenciaDto } from './frecuencia.model';
import { FrecuenciaService } from './frecuencia.service';

describe('FrecuenciaService', () => {
  const url = `${API_URL}/frecuencias`;
  const datos: CrearFrecuenciaDto = { cooperativaId: 4, rutaId: 2, resolucionAntId: 3, codigo: null, horaSalida: '00:00:00' };
  const frecuencia: FrecuenciaDto = { ...datos, id: 7, activa: false };
  let servicio: FrecuenciaService; let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    servicio = TestBed.inject(FrecuenciaService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lista con GET e incluye inactivas sin filtros implícitos', () => {
    const recibido = vi.fn(); servicio.listar().subscribe(recibido); const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('GET'); expect(peticion.request.params.keys()).toEqual([]);
    peticion.flush([frecuencia]); expect(recibido).toHaveBeenCalledWith([frecuencia]);
  });
  it('solo añade los filtros soportados por el backend', () => {
    servicio.listar(4, 2).subscribe(); const peticion = http.expectOne(r => r.url === url);
    expect(peticion.request.params.get('cooperativaId')).toBe('4'); expect(peticion.request.params.get('rutaId')).toBe('2'); peticion.flush([]);
  });
  it('consulta por ID con GET y conserva el horario y los nulos', () => {
    const recibido = vi.fn(); servicio.obtener(7).subscribe(recibido); const peticion = http.expectOne(`${url}/7`);
    expect(peticion.request.method).toBe('GET'); peticion.flush(frecuencia); expect(recibido).toHaveBeenCalledWith(frecuencia);
  });
  it('registra mediante POST con medianoche, código null y sin id ni activa', () => {
    const recibido = vi.fn(); servicio.crear(datos).subscribe(recibido); const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('POST'); expect(peticion.request.body).toEqual(datos);
    expect(peticion.request.serializeBody()).toBe(JSON.stringify(datos));
    expect(peticion.request.body).not.toHaveProperty('activa'); expect(peticion.request.body).not.toHaveProperty('id');
    peticion.flush({ ...frecuencia, activa: true }, { status: 201, statusText: 'Created' }); expect(recibido).toHaveBeenCalledWith({ ...frecuencia, activa: true });
  });
  it('actualiza por PUT con estado false, código vacío y segundos exactos', () => {
    const actualizacion = { ...datos, activa: false, codigo: '', horaSalida: '23:59:59.1234567' };
    servicio.actualizar(7, actualizacion).subscribe(); const peticion = http.expectOne(`${url}/7`);
    expect(peticion.request.method).toBe('PUT'); expect(peticion.request.body).toEqual(actualizacion); peticion.flush({ ...actualizacion, id: 7 });
  });
  it('desactiva con DELETE sin cuerpo y procesa 204', () => {
    const completar = vi.fn(); servicio.darDeBaja(7).subscribe({ complete: completar }); const peticion = http.expectOne(`${url}/7`);
    expect(peticion.request.method).toBe('DELETE'); expect(peticion.request.body).toBeNull();
    peticion.flush(null, { status: 204, statusText: 'No Content' }); expect(completar).toHaveBeenCalledOnce();
  });
  it.each([400, 401, 403, 404, 409, 500])('propaga HTTP %s', status => {
    const error = vi.fn(); servicio.crear(datos).subscribe({ error }); http.expectOne(url).flush({ mensaje: 'Detalle de negocio.' }, { status, statusText: 'Error' });
    expect((error.mock.calls[0][0] as HttpErrorResponse).status).toBe(status);
  });
  it('propaga fallos de conexión sin inventar registros', () => {
    const recibido = vi.fn(); const error = vi.fn(); servicio.listar().subscribe({ next: recibido, error });
    http.expectOne(url).error(new ProgressEvent('error')); expect(recibido).not.toHaveBeenCalled(); expect((error.mock.calls[0][0] as HttpErrorResponse).status).toBe(0);
  });
  it('reutiliza el interceptor JWT existente', () => {
    const previa = localStorage.getItem(AUTH_SESSION_KEY);
    try {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ token: 'token-exclusivo-de-prueba' })); servicio.listar().subscribe();
      const peticion = http.expectOne(url); expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-exclusivo-de-prueba'); peticion.flush([]);
    } finally { if (previa === null) localStorage.removeItem(AUTH_SESSION_KEY); else localStorage.setItem(AUTH_SESSION_KEY, previa); }
  });
});

describe('Errores de frecuencias', () => {
  it.each([[0, 'conexión'], [400, 'Revisa'], [401, 'sesión'], [403, 'permisos'], [404, 'no está disponible'], [409, 'conflicto'], [500, 'servidor']])('distingue HTTP %s', (status, mensaje) => {
    expect(mensajeErrorFrecuencia(new HttpErrorResponse({ status: Number(status) }))).toContain(mensaje);
  });
  it('presenta conflictos y errores de validación del backend', () => {
    expect(mensajeErrorFrecuencia(new HttpErrorResponse({ status: 409, error: { mensaje: 'Frecuencia duplicada, aunque esté inactiva.' } }))).toContain('duplicada');
    expect(mensajeErrorFrecuencia(new HttpErrorResponse({ status: 400, error: { errors: { HoraSalida: ['Hora inválida.'] } } }))).toBe('Hora inválida.');
  });
  it('oculta detalles técnicos incluso si vienen en mensaje', () => {
    expect(mensajeErrorFrecuencia(new HttpErrorResponse({ status: 500, error: { mensaje: 'SQL privado' } }))).not.toContain('SQL');
    expect(mensajeErrorFrecuencia(new Error('Npgsql privado'))).not.toContain('Npgsql');
  });
});
