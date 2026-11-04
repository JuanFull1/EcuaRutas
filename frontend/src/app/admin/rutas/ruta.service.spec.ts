import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../../services/api.config';
import { CrearRutaDto, RutaDto } from './ruta.model';
import { RutaService } from './ruta.service';

describe('RutaService', () => {
  let servicio: RutaService;
  let http: HttpTestingController;
  const url = `${API_URL}/rutas`;
  const datos: CrearRutaDto = { nombre: 'Quito – Cuenca', origenLugarId: 11, destinoLugarId: 22, tipoViaje: 'DIRECTO' };
  const ruta: RutaDto = { ...datos, id: 7, activa: false };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(RutaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista rutas activas e inactivas sin parámetros de paginación inventados', () => {
    const recibido = vi.fn();
    servicio.listar().subscribe(recibido);
    const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.keys()).toEqual([]);
    peticion.flush([ruta, { ...ruta, id: 8, activa: true }]);
    expect(recibido).toHaveBeenCalledWith([ruta, { ...ruta, id: 8, activa: true }]);
  });

  it('consulta el identificador solicitado y conserva sus valores', () => {
    const recibido = vi.fn();
    servicio.obtener(7).subscribe(recibido);
    const peticion = http.expectOne(`${url}/7`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(ruta);
    expect(recibido).toHaveBeenCalledWith(ruta);
  });

  it('crea con POST y procesa 201 sin agregar activa ni id al cuerpo', () => {
    const recibido = vi.fn();
    servicio.crear(datos).subscribe(recibido);
    const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(datos);
    peticion.flush({ ...ruta, activa: true }, { status: 201, statusText: 'Created' });
    expect(recibido).toHaveBeenCalledWith({ ...ruta, activa: true });
  });

  it('actualiza por PUT al ID correcto conservando activa false', () => {
    const { id, ...actualizacion } = ruta;
    const recibido = vi.fn();
    servicio.actualizar(id, actualizacion).subscribe(recibido);
    const peticion = http.expectOne(`${url}/7`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual(actualizacion);
    peticion.flush(ruta);
    expect(recibido).toHaveBeenCalledWith(ruta);
  });

  it('realiza la baja por DELETE sin cuerpo y acepta 204', () => {
    const completado = vi.fn();
    servicio.darDeBaja(7).subscribe({ complete: completado });
    const peticion = http.expectOne(`${url}/7`);
    expect(peticion.request.method).toBe('DELETE');
    expect(peticion.request.body).toBeNull();
    peticion.flush(null, { status: 204, statusText: 'No Content' });
    expect(completado).toHaveBeenCalledOnce();
  });

  it.each([400, 401, 403, 404, 409, 500, 503])('propaga HTTP %s con sus detalles para que la interfaz lo interprete', status => {
    const error = vi.fn();
    servicio.actualizar(7, ruta).subscribe({ error });
    http.expectOne(`${url}/7`).flush({ mensaje: 'Detalle del backend.' }, { status, statusText: 'Error' });
    const recibido = error.mock.calls[0][0] as HttpErrorResponse;
    expect(recibido.status).toBe(status);
    expect(recibido.error).toEqual({ mensaje: 'Detalle del backend.' });
  });

  it('propaga fallos de conexión sin devolver datos ficticios', () => {
    const error = vi.fn();
    const recibido = vi.fn();
    servicio.listar().subscribe({ next: recibido, error });
    http.expectOne(url).error(new ProgressEvent('error'));
    expect(error.mock.calls[0][0].status).toBe(0);
    expect(recibido).not.toHaveBeenCalled();
  });
});
