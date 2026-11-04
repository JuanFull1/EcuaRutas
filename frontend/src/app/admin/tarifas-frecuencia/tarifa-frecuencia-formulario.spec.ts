import { TestBed } from '@angular/core/testing';
import { FrecuenciaDto } from '../frecuencias/frecuencia.model';
import { RutaParadaDto } from '../paradas/ruta-parada.model';
import { TarifaFrecuenciaFormulario } from './tarifa-frecuencia-formulario';
import { TarifaFrecuenciaDto, precioEnCentavos } from './tarifa-frecuencia.model';

describe('TarifaFrecuenciaFormulario', () => {
  const frecuencia: FrecuenciaDto = { id: 11, rutaId: 22, cooperativaId: 4, resolucionAntId: 3, codigo: null, horaSalida: '00:00:00', activa: true };
  const parada = (id: number, orden: number, rutaId = 22): RutaParadaDto => ({ id, orden, rutaId, lugarId: id + 1000, kmAcumulado: null, minutosAcumulados: null, permiteAscenso: true, permiteDescenso: true });
  const paradas = [parada(10, 2), parada(20, 3), parada(90, 0), parada(80, 1), parada(50, 4, 99)];
  const tarifa: TarifaFrecuenciaDto = { id: 7, frecuenciaId: 11, origenRutaParadaId: 90, destinoRutaParadaId: 10, precioBase: 5.25, activa: false };
  beforeEach(() => TestBed.configureTestingModule({}));
  const crear = (actual: TarifaFrecuenciaDto | null = null, contexto = frecuencia) => {
    const fixture = TestBed.createComponent(TarifaFrecuenciaFormulario);
    fixture.componentRef.setInput('frecuencia', contexto); fixture.componentRef.setInput('tarifa', actual);
    fixture.componentRef.setInput('paradas', paradas); fixture.componentRef.setInput('autorizado', true); fixture.detectChanges(); return fixture;
  };
  const completar = (componente: TarifaFrecuenciaFormulario, precioBase = '0') => componente.form.patchValue({ origenRutaParadaId: 90, destinoRutaParadaId: 10, precioBase });

  it('ordena por Orden y excluye paradas ajenas aunque sus identificadores parezcan válidos', () => {
    const componente = crear().componentInstance; expect(componente.paradasOrdenadas().map(p => p.id)).toEqual([90, 80, 10, 20]);
    expect(componente.paradasOrdenadas().some(p => p.id === 50)).toBe(false);
  });
  it('rechaza el formulario incompleto y marca campos', () => {
    const fixture = crear(); const componente = fixture.componentInstance; const emitir = vi.fn(); componente.guardarTarifa.subscribe(emitir);
    componente.guardar(); fixture.detectChanges(); expect(emitir).not.toHaveBeenCalled(); expect(componente.form.invalid).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.invalid-feedback').length).toBeGreaterThan(0);
  });
  it.each(['0', '0,29', '1.01', '99999999.99'])('crea con el precio exacto %s como número JSON y RutaParadaId', precio => {
    const componente = crear().componentInstance; const emitir = vi.fn(); componente.guardarTarifa.subscribe(emitir); completar(componente, precio); componente.guardar();
    const evento = emitir.mock.calls[0][0]; expect(evento.frecuenciaId).toBe(11);
    expect(evento.datos).toEqual({ origenRutaParadaId: 90, destinoRutaParadaId: 10, precioBase: Number(precio.replace(',', '.')) });
    expect(typeof evento.datos.precioBase).toBe('number'); expect(evento.datos).not.toHaveProperty('frecuenciaId');
  });
  it.each(['-0.01', '100000000', '99999999.999', '1.001', '1.230', '1e-3', '0.0000000000000000001', 'NaN', 'Infinity', '1.2.3'])('rechaza %s sin redondear', precio => {
    const componente = crear().componentInstance; completar(componente, precio); const emitir = vi.fn(); componente.guardarTarifa.subscribe(emitir); componente.guardar();
    expect(componente.form.controls.precioBase.invalid).toBe(true); expect(emitir).not.toHaveBeenCalled(); expect(componente.form.controls.precioBase.value).toBe(precio);
  });
  it('rechaza extremos iguales, orden invertido y paradas ajenas', () => {
    const componente = crear().componentInstance; completar(componente);
    componente.form.controls.destinoRutaParadaId.setValue(90); expect(componente.form.hasError('extremosIguales')).toBe(true);
    componente.form.patchValue({ origenRutaParadaId: 10, destinoRutaParadaId: 80 }); expect(componente.form.hasError('orden')).toBe(true);
    componente.form.controls.destinoRutaParadaId.setValue(50); expect(componente.form.hasError('destinoAjeno')).toBe(true);
    componente.form.controls.origenRutaParadaId.setValue(50); expect(componente.form.hasError('origenAjeno')).toBe(true);
  });
  it.each(['origenRutaParadaId', 'destinoRutaParadaId'] as const)('valida ID positivo e íntegro en %s', campo => {
    const componente = crear().componentInstance; completar(componente);
    for (const id of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) { componente.form.controls[campo].setValue(id); expect(componente.form.controls[campo].invalid).toBe(true); }
  });
  it('filtra destinos por Orden y solo limpia el destino incompatible al cambiar origen', () => {
    const componente = crear().componentInstance; completar(componente);
    expect(componente.destinosDisponibles().map(p => p.id)).toEqual([80, 10, 20]);
    componente.form.controls.origenRutaParadaId.setValue(80); expect(componente.form.controls.destinoRutaParadaId.value).toBe(10);
    componente.form.controls.origenRutaParadaId.setValue(10); expect(componente.form.controls.destinoRutaParadaId.value).toBeNull();
    expect(componente.destinosDisponibles().map(p => p.id)).toEqual([20]);
  });
  it('no utiliza LugarId en lugar del identificador de parada', () => {
    const componente = crear().componentInstance; completar(componente); componente.form.controls.origenRutaParadaId.setValue(1090);
    expect(componente.form.hasError('origenAjeno')).toBe(true);
    expect(componente.etiqueta(paradas[2])).toContain('Lugar #1090'); expect(componente.etiqueta(paradas[2])).toContain('Parada #90');
  });
  it('edita conservando frecuencia, precio y estado false', () => {
    const componente = crear(tarifa).componentInstance; const emitir = vi.fn(); componente.guardarTarifa.subscribe(emitir); componente.guardar();
    expect(emitir).toHaveBeenCalledWith({ modo: 'editar', frecuenciaId: 11, id: 7, datos: { origenRutaParadaId: 90, destinoRutaParadaId: 10, precioBase: 5.25, activa: false } });
  });
  it('no permite editar una tarifa de otra frecuencia', () => {
    const componente = crear({ ...tarifa, frecuenciaId: 12 }).componentInstance; expect(componente.form.hasError('frecuencia')).toBe(true);
  });
  it('respeta la política de frecuencia inactiva del backend', () => {
    const nueva = crear(null, { ...frecuencia, activa: false }).componentInstance; completar(nueva); expect(nueva.form.hasError('frecuenciaInactiva')).toBe(true);
    const activa = crear({ ...tarifa, activa: true }, { ...frecuencia, activa: false }).componentInstance;
    expect(activa.form.valid).toBe(true); activa.form.controls.precioBase.setValue('8'); expect(activa.form.hasError('frecuenciaInactiva')).toBe(true);
    const inactiva = crear(tarifa, { ...frecuencia, activa: false }).componentInstance;
    inactiva.form.controls.precioBase.setValue('8'); expect(inactiva.form.valid).toBe(true);
  });
  it('muestra ausencia de paradas y bloquea envío sin permiso o durante carga, error o guardado', () => {
    const fixture = crear(); const componente = fixture.componentInstance; completar(componente); const emitir = vi.fn(); componente.guardarTarifa.subscribe(emitir);
    fixture.componentRef.setInput('autorizado', false); componente.guardar();
    fixture.componentRef.setInput('autorizado', true); fixture.componentRef.setInput('guardando', true); componente.guardar();
    fixture.componentRef.setInput('guardando', false); fixture.componentRef.setInput('cargandoParadas', true); componente.guardar();
    fixture.componentRef.setInput('cargandoParadas', false); fixture.componentRef.setInput('errorParadas', 'Catálogo no disponible'); componente.guardar();
    fixture.componentRef.setInput('errorParadas', null); fixture.componentRef.setInput('paradas', []); fixture.detectChanges(); componente.guardar();
    expect(emitir).not.toHaveBeenCalled(); expect((fixture.nativeElement as HTMLElement).textContent).toContain('Se necesitan al menos dos paradas');
  });
  it('revalida un catálogo modificado sin alterar el precio', () => {
    const fixture = crear(tarifa); const componente = fixture.componentInstance;
    fixture.componentRef.setInput('paradas', paradas.map(p => p.id === 10 ? { ...p, orden: 0 } : p)); fixture.detectChanges();
    expect(componente.form.controls.destinoRutaParadaId.value).toBeNull(); expect(componente.form.controls.precioBase.value).toBe('5.25');
  });
});

describe('Precio decimal exacto', () => {
  it.each([['0', 0n], ['0.29', 29n], ['1,01', 101n], ['99999999.99', 9999999999n], ['0005.20', 520n]])('interpreta %s en centavos', (texto, centavos) => {
    expect(precioEnCentavos(texto)).toBe(centavos);
  });
  it.each([null, undefined, 1.01, '', ' ', '100000000', '-1', '0.001', '1e2'])('rechaza entrada no válida: %s', precio => expect(precioEnCentavos(precio)).toBeNull());
});
