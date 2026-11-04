import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LugarDto } from '../lugares/lugar.model';
import { GuardarParada, ParadaFormulario } from './parada-formulario';
import { RutaParadaDto } from './ruta-parada.model';

describe('ParadaFormulario', () => {
  const lugares: LugarDto[] = [
    { id: 11, nombre: 'Quito', provincia: null, canton: null, tipo: 'CIUDAD', ubicacion: null, activo: true },
    { id: 22, nombre: 'Cuenca', provincia: null, canton: null, tipo: 'TERMINAL', ubicacion: null, activo: true },
    { id: 33, nombre: 'Loja', provincia: null, canton: null, tipo: 'PARADA', ubicacion: null, activo: false }
  ];
  const parada: RutaParadaDto = {
    id: 101, rutaId: 7, lugarId: 11, orden: 0, kmAcumulado: null, minutosAcumulados: null,
    permiteAscenso: false, permiteDescenso: false
  };
  let fixture: ComponentFixture<ParadaFormulario>;
  let componente: ParadaFormulario;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ParadaFormulario] });
    fixture = TestBed.createComponent(ParadaFormulario);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('rutaId', 7);
    fixture.componentRef.setInput('lugares', lugares);
    fixture.componentRef.setInput('autorizado', true);
  });

  function preparar(edicion: RutaParadaDto | null = null): void {
    fixture.componentRef.setInput('parada', edicion);
    fixture.detectChanges();
    if (edicion === null) componente.form.patchValue({ lugarId: 11, orden: 0 });
  }

  it('exige lugar y orden, marca los campos inválidos y no emite', () => {
    fixture.detectChanges();
    const emitir = vi.spyOn(componente.guardarParada, 'emit');
    componente.guardar();
    fixture.detectChanges();
    expect(componente.form.controls.lugarId.invalid).toBe(true);
    expect(componente.form.controls.orden.invalid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Selecciona un lugar existente');
    expect(emitir).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, NaN, Infinity])('rechaza lugarId inválido %s', valor => {
    preparar();
    componente.form.controls.lugarId.setValue(valor);
    expect(componente.form.invalid).toBe(true);
  });

  it('mantiene IDs numéricos al seleccionar nombres del catálogo simulado', () => {
    preparar();
    const selector = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('#parada-lugar')!;
    expect(selector.textContent).toContain('Quito');
    expect(selector.textContent).toContain('Cuenca');
    expect(selector.textContent).not.toContain('Loja');
    selector.selectedIndex = 2;
    selector.dispatchEvent(new Event('change'));
    expect(componente.form.controls.lugarId.value).toBe(22);
  });

  it.each([-1, 0.1, 2147483648, NaN, Infinity])('rechaza orden inválido %s', valor => {
    preparar();
    componente.form.controls.orden.setValue(valor);
    expect(componente.form.controls.orden.invalid).toBe(true);
  });

  it.each([0, 2147483647])('acepta orden en el límite %s', valor => {
    preparar();
    componente.form.controls.orden.setValue(valor);
    expect(componente.form.valid).toBe(true);
  });

  it.each([null, 0, 1.01, -1.01, 99999999.99, -99999999.99])('acepta kilómetros permitidos %s sin imponer mínimos inexistentes', valor => {
    preparar();
    componente.form.controls.kmAcumulado.setValue(valor);
    expect(componente.form.valid).toBe(true);
  });

  it.each([0.001, 1.005, -1.001, 100000000, -100000000, NaN, Infinity])('rechaza kilómetros inválidos %s', valor => {
    preparar();
    componente.form.controls.kmAcumulado.setValue(valor);
    expect(componente.form.controls.kmAcumulado.invalid).toBe(true);
  });

  it.each([null, 0, -1, -2147483648, 2147483647])('acepta minutos permitidos %s', valor => {
    preparar();
    componente.form.controls.minutosAcumulados.setValue(valor);
    expect(componente.form.valid).toBe(true);
  });

  it.each([1.5, -2147483649, 2147483648, NaN, Infinity])('rechaza minutos inválidos %s', valor => {
    preparar();
    componente.form.controls.minutosAcumulados.setValue(valor);
    expect(componente.form.controls.minutosAcumulados.invalid).toBe(true);
  });

  it('envía el DTO exacto con null, cero y false al crear', () => {
    preparar();
    const recibido: GuardarParada[] = [];
    componente.guardarParada.subscribe(evento => recibido.push(evento));
    componente.guardar();
    expect(recibido).toEqual([{
      modo: 'crear', rutaId: 7,
      datos: { lugarId: 11, orden: 0, kmAcumulado: null, minutosAcumulados: null, permiteAscenso: false, permiteDescenso: false }
    }]);
  });

  it('precarga todos los campos de edición y permite limpiar acumulados conservando false', () => {
    preparar({ ...parada, kmAcumulado: 0, minutosAcumulados: 0 });
    expect(componente.form.getRawValue()).toEqual({
      lugarId: 11, orden: 0, kmAcumulado: 0, minutosAcumulados: 0, permiteAscenso: false, permiteDescenso: false
    });
    const emitir = vi.spyOn(componente.guardarParada, 'emit');
    componente.form.patchValue({ kmAcumulado: null, minutosAcumulados: null });
    componente.guardar();
    const { id, rutaId, ...datos } = parada;
    expect(emitir).toHaveBeenCalledExactlyOnceWith({ modo: 'editar', id, rutaId, datos });
  });

  it('convierte campos numéricos vacíos en null, conservando cero explícito', () => {
    preparar();
    for (const id of ['parada-km', 'parada-minutos']) {
      const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = '0';
      input.dispatchEvent(new Event('input'));
    }
    expect(componente.form.controls.kmAcumulado.value).toBe(0);
    expect(componente.form.controls.minutosAcumulados.value).toBe(0);
    for (const id of ['parada-km', 'parada-minutos']) {
      const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = '';
      input.dispatchEvent(new Event('input'));
    }
    expect(componente.form.controls.kmAcumulado.value).toBeNull();
    expect(componente.form.controls.minutosAcumulados.value).toBeNull();
  });

  it('detecta lugar y orden duplicados solo en la misma ruta', () => {
    preparar();
    fixture.componentRef.setInput('paradas', [{ ...parada, id: 102 }]);
    fixture.detectChanges();
    expect(componente.form.hasError('lugarDuplicado')).toBe(true);
    expect(componente.form.hasError('ordenDuplicado')).toBe(true);
    fixture.componentRef.setInput('paradas', [{ ...parada, id: 102, rutaId: 8 }]);
    fixture.detectChanges();
    expect(componente.form.valid).toBe(true);
  });

  it('excluye la parada actual al validar duplicados durante la edición', () => {
    preparar(parada);
    fixture.componentRef.setInput('paradas', [parada, { ...parada, id: 102, lugarId: 22, orden: 1 }]);
    fixture.detectChanges();
    expect(componente.form.valid).toBe(true);
    componente.form.patchValue({ lugarId: 22, orden: 1 });
    expect(componente.form.hasError('lugarDuplicado')).toBe(true);
    expect(componente.form.hasError('ordenDuplicado')).toBe(true);
  });

  it('no acepta un lugar inexistente ni un lugar inactivo nuevo', () => {
    preparar();
    componente.form.controls.lugarId.setValue(999);
    expect(componente.form.hasError('lugarInexistente')).toBe(true);
    componente.form.controls.lugarId.setValue(33);
    expect(componente.form.hasError('lugarInactivo')).toBe(true);
  });

  it('permite conservar el lugar inactivo actual pero no cambiar a otro inactivo', () => {
    preparar({ ...parada, lugarId: 33 });
    expect(componente.form.valid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Loja');
    fixture.componentRef.setInput('lugares', [...lugares, { ...lugares[2], id: 44, nombre: 'Otro inactivo' }]);
    fixture.detectChanges();
    componente.form.controls.lugarId.setValue(44);
    expect(componente.form.hasError('lugarInactivo')).toBe(true);
  });

  it('muestra el catálogo vacío y revalida referencias desaparecidas', () => {
    preparar();
    fixture.componentRef.setInput('lugares', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay lugares disponibles');
    expect(componente.form.hasError('lugarInexistente')).toBe(true);
  });

  it('no reemplaza silenciosamente un lugar desaparecido al editar', () => {
    preparar({ ...parada, lugarId: 999 });
    expect(fixture.nativeElement.textContent).toContain('Lugar #999 (no disponible)');
    expect(componente.form.controls.lugarId.value).toBe(999);
    expect(componente.form.invalid).toBe(true);
  });

  it('no emite si la parada pertenece a otra ruta o no existe ruta seleccionada', () => {
    preparar({ ...parada, rutaId: 8 });
    const emitir = vi.spyOn(componente.guardarParada, 'emit');
    componente.guardar();
    fixture.componentRef.setInput('rutaId', null);
    componente.guardar();
    expect(emitir).not.toHaveBeenCalled();
  });

  it.each(['guardando', 'cargandoLugares', 'errorLugares', 'autorizado'] as const)('bloquea envíos repetidos cuando %s impide guardar', entrada => {
    preparar();
    fixture.componentRef.setInput(entrada, entrada === 'errorLugares' ? 'Error de conexión' : entrada !== 'autorizado');
    fixture.detectChanges();
    const emitir = vi.spyOn(componente.guardarParada, 'emit');
    componente.guardar();
    componente.guardar();
    expect(emitir).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);
  });

  it('permite reintentar lugares y cancelar sin emitir datos', () => {
    preparar();
    fixture.componentRef.setInput('errorLugares', 'Error de conexión');
    fixture.detectChanges();
    const reintentar = vi.spyOn(componente.reintentarLugares, 'emit');
    const cancelar = vi.spyOn(componente.cancelar, 'emit');
    const botones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    botones.find(boton => boton.textContent.includes('Reintentar'))!.click();
    botones.find(boton => boton.textContent.includes('Cancelar'))!.click();
    expect(reintentar).toHaveBeenCalledOnce();
    expect(cancelar).toHaveBeenCalledOnce();
  });
});
