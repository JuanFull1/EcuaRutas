import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { authInterceptor } from '../../interceptors/auth.interceptor';
import { API_URL } from '../../services/api.config';
import { AUTH_SESSION_KEY } from '../../services/auth.service';
import { mensajeErrorTarifa } from './tarifa-frecuencia-error';
import { CrearTarifaFrecuenciaDto, TarifaFrecuenciaDto } from './tarifa-frecuencia.model';
import { TarifaFrecuenciaService } from './tarifa-frecuencia.service';

describe('TarifaFrecuenciaService', () => {
  const url = `${API_URL}/frecuencias/11/tarifas`;
  const datos: CrearTarifaFrecuenciaDto = { origenRutaParadaId: 90, destinoRutaParadaId: 10, precioBase: 0 };
  const actual: TarifaFrecuenciaDto = { ...datos, id: 7, frecuenciaId: 11, activa: false };
  let servicio: TarifaFrecuenciaService; let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    servicio = TestBed.inject(TarifaFrecuenciaService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('lista por frecuencia incluyendo inactivas', () => {
    const recibido = vi.fn(); servicio.listar(11).subscribe(recibido); const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('GET'); expect(peticion.request.params.keys()).toEqual([]); peticion.flush([actual]); expect(recibido).toHaveBeenCalledWith([actual]);
  });
  it('consulta individual mediante la ruta subordinada', () => {
    const recibido = vi.fn(); servicio.obtener(11, 7).subscribe(recibido); const peticion = http.expectOne(`${url}/7`);
    expect(peticion.request.method).toBe('GET'); peticion.flush(actual); expect(recibido).toHaveBeenCalledWith(actual);
  });
  it.each([0, 0.29, 1.01, 99999999.99])('crea precio numérico %s sin frecuencia redundante en el cuerpo', precioBase => {
    servicio.crear(11, { ...datos, precioBase }).subscribe(); const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('POST'); expect(peticion.request.body).toEqual({ ...datos, precioBase });
    expect(peticion.request.serializeBody()).toBe(JSON.stringify({ ...datos, precioBase }));
    for (const campo of ['frecuenciaId', 'id', 'activa', 'lugarId']) expect(peticion.request.body).not.toHaveProperty(campo);
    peticion.flush({ ...actual, precioBase, activa: true }, { status: 201, statusText: 'Created' });
  });
  it('actualiza el ID correcto con precio y estado false', () => {
    const datosActualizados = { ...datos, precioBase: 12.34, activa: false }; servicio.actualizar(11, 7, datosActualizados).subscribe();
    const peticion = http.expectOne(`${url}/7`); expect(peticion.request.method).toBe('PUT'); expect(peticion.request.body).toEqual(datosActualizados);
    peticion.flush({ ...actual, ...datosActualizados });
  });
  it('desactiva con DELETE sin cuerpo y admite 204', () => {
    const completar = vi.fn(); servicio.darDeBaja(11, 7).subscribe({ complete: completar }); const peticion = http.expectOne(`${url}/7`);
    expect(peticion.request.method).toBe('DELETE'); expect(peticion.request.body).toBeNull(); peticion.flush(null, { status: 204, statusText: 'No Content' }); expect(completar).toHaveBeenCalledOnce();
  });
  it('no conserva una frecuencia previa dentro del servicio', () => {
    servicio.listar(12).subscribe(); http.expectOne(`${API_URL}/frecuencias/12/tarifas`).flush([]);
    servicio.listar(11).subscribe(); http.expectOne(url).flush([]);
  });
  it.each([400, 401, 403, 404, 409, 500])('propaga HTTP %s', status => {
    const error = vi.fn(); servicio.crear(11, datos).subscribe({ error }); http.expectOne(url).flush({ mensaje: 'Detalle del backend.' }, { status, statusText: 'Error' });
    expect((error.mock.calls[0][0] as HttpErrorResponse).status).toBe(status);
  });
  it('propaga conexión fallida sin devolver tarifas inventadas', () => {
    const error = vi.fn(); const recibido = vi.fn(); servicio.listar(11).subscribe({ next: recibido, error }); http.expectOne(url).error(new ProgressEvent('error'));
    expect(recibido).not.toHaveBeenCalled(); expect((error.mock.calls[0][0] as HttpErrorResponse).status).toBe(0);
  });
  it('utiliza el interceptor JWT existente', () => {
    const previa = localStorage.getItem(AUTH_SESSION_KEY);
    try {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ token: 'token-exclusivo-de-prueba' })); servicio.listar(11).subscribe();
      const peticion = http.expectOne(url); expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-exclusivo-de-prueba'); peticion.flush([]);
    } finally { if (previa === null) localStorage.removeItem(AUTH_SESSION_KEY); else localStorage.setItem(AUTH_SESSION_KEY, previa); }
  });
});

describe('Errores de tarifas', () => {
  it.each([[0, 'conexión'], [400, 'precio'], [401, 'sesión'], [403, 'permisos'], [404, 'no está disponible'], [409, 'conflicto'], [500, 'servidor']])('distingue HTTP %s', (status, texto) => {
    expect(mensajeErrorTarifa(new HttpErrorResponse({ status: Number(status) }))).toContain(texto);
  });
  it('muestra conflictos y validaciones del backend sin exponer errores técnicos', () => {
    expect(mensajeErrorTarifa(new HttpErrorResponse({ status: 409, error: { mensaje: 'Ya existe una tarifa inactiva para ese tramo.' } }))).toContain('inactiva');
    expect(mensajeErrorTarifa(new HttpErrorResponse({ status: 400, error: { errors: { PrecioBase: ['Precio inválido.'] } } }))).toBe('Precio inválido.');
    expect(mensajeErrorTarifa(new HttpErrorResponse({ status: 500, error: { mensaje: 'Npgsql privado' } }))).not.toContain('Npgsql');
    expect(mensajeErrorTarifa(new Error('SQL privado'))).not.toContain('SQL');
  });
});
