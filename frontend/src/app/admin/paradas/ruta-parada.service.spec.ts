import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../../services/api.config';
import { CrearRutaParadaDto, RutaParadaDto } from './ruta-parada.model';
import { RutaParadaService } from './ruta-parada.service';

describe('RutaParadaService', () => {
  const url = `${API_URL}/rutas/7/paradas`;
  const datos: CrearRutaParadaDto = {
    lugarId: 11, orden: 0, kmAcumulado: null, minutosAcumulados: 0, permiteAscenso: false, permiteDescenso: false
  };
  const parada: RutaParadaDto = { ...datos, id: 101, rutaId: 7 };
  let servicio: RutaParadaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(RutaParadaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista exclusivamente las paradas de la ruta indicada sin parámetros adicionales', () => {
    const recibido = vi.fn();
    servicio.listar(7).subscribe(recibido);
    const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.keys()).toEqual([]);
    peticion.flush([parada]);
    expect(recibido).toHaveBeenCalledWith([parada]);
  });

  it('distingue los identificadores de ruta y parada al consultar el detalle', () => {
    const recibido = vi.fn();
    servicio.obtener(7, 101).subscribe(recibido);
    const peticion = http.expectOne(`${url}/101`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(parada);
    expect(recibido).toHaveBeenCalledWith(parada);
  });

  it('crea mediante POST y acepta 201 conservando null, cero y false', () => {
    const recibido = vi.fn();
    servicio.crear(7, datos).subscribe(recibido);
    const peticion = http.expectOne(url);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(datos);
    expect(peticion.request.body.rutaId).toBeUndefined();
    peticion.flush(parada, { status: 201, statusText: 'Created' });
    expect(recibido).toHaveBeenCalledWith(parada);
  });

  it('actualiza mediante PUT con ambos IDs en la URL y solo el DTO en el cuerpo', () => {
    const recibido = vi.fn();
    servicio.actualizar(7, 101, datos).subscribe(recibido);
    const peticion = http.expectOne(`${url}/101`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual(datos);
    peticion.flush(parada);
    expect(recibido).toHaveBeenCalledWith(parada);
  });

  it('elimina mediante DELETE sin cuerpo y acepta 204', () => {
    const completado = vi.fn();
    servicio.eliminar(7, 101).subscribe({ complete: completado });
    const peticion = http.expectOne(`${url}/101`);
    expect(peticion.request.method).toBe('DELETE');
    expect(peticion.request.body).toBeNull();
    peticion.flush(null, { status: 204, statusText: 'No Content' });
    expect(completado).toHaveBeenCalledOnce();
  });

  it('no reutiliza una URL de la ruta anterior', () => {
    servicio.listar(7).subscribe();
    servicio.listar(8).subscribe();
    http.expectOne(url).flush([]);
    http.expectOne(`${API_URL}/rutas/8/paradas`).flush([]);
  });

  it.each([400, 401, 403, 404, 409, 500, 503])('propaga HTTP %s con los detalles del backend', status => {
    const error = vi.fn();
    servicio.actualizar(7, 101, datos).subscribe({ error });
    http.expectOne(`${url}/101`).flush({ mensaje: 'Conflicto de negocio.' }, { status, statusText: 'Error' });
    const recibido = error.mock.calls[0][0] as HttpErrorResponse;
    expect(recibido.status).toBe(status);
    expect(recibido.error).toEqual({ mensaje: 'Conflicto de negocio.' });
  });

  it('propaga errores de conexión sin reemplazarlos por registros ficticios', () => {
    const error = vi.fn();
    const recibido = vi.fn();
    servicio.listar(7).subscribe({ next: recibido, error });
    http.expectOne(url).error(new ProgressEvent('error'));
    expect(error.mock.calls[0][0].status).toBe(0);
    expect(recibido).not.toHaveBeenCalled();
  });
});
