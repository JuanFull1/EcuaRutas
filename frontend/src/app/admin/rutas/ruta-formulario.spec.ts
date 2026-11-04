import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LugarDto } from '../lugares/lugar.model';
import { GuardarRuta, RutaFormulario } from './ruta-formulario';
import { RutaDto } from './ruta.model';

describe('RutaFormulario', () => {
  const lugares: LugarDto[] = [
    { id: 11, nombre: 'Quito', provincia: null, canton: null, tipo: 'CIUDAD', ubicacion: null, activo: true },
    { id: 22, nombre: 'Cuenca', provincia: null, canton: null, tipo: 'TERMINAL', ubicacion: null, activo: true },
    { id: 33, nombre: 'Loja', provincia: null, canton: null, tipo: 'CIUDAD', ubicacion: null, activo: false }
  ];
  const ruta: RutaDto = { id: 7, nombre: 'Quito – Cuenca', origenLugarId: 11, destinoLugarId: 22, tipoViaje: 'CON_PARADAS', activa: false };
  let fixture: ComponentFixture<RutaFormulario>;
  let componente: RutaFormulario;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RutaFormulario] });
    fixture = TestBed.createComponent(RutaFormulario);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('autorizado', true);
    fixture.componentRef.setInput('lugares', lugares);
  });

  function preparar(edicion: RutaDto | null = null): void {
    fixture.componentRef.setInput('ruta', edicion);
    fixture.detectChanges();
    if (edicion === null) componente.form.patchValue({ nombre: 'Quito – Cuenca', origenLugarId: 11, destinoLugarId: 22, tipoViaje: 'DIRECTO' });
  }

  it('rechaza todos los campos obligatorios vacíos y muestra errores al enviar', () => {
    fixture.detectChanges();
    const emitir = vi.spyOn(componente.guardarRuta, 'emit');
    componente.guardar();
    fixture.detectChanges();
    expect(componente.form.invalid).toBe(true);
    expect(componente.form.controls.nombre.touched).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Selecciona un lugar de origen existente');
    expect(emitir).not.toHaveBeenCalled();
  });

  it('valida nombre sin espacios, máximo de 200 caracteres y el enum real', () => {
    preparar();
    componente.form.patchValue({ nombre: '   ' });
    expect(componente.form.controls.nombre.invalid).toBe(true);
    componente.form.patchValue({ nombre: 'A'.repeat(201) });
    expect(componente.form.controls.nombre.invalid).toBe(true);
    componente.form.patchValue({ nombre: 'A'.repeat(200), tipoViaje: 'DIRECTO' });
    expect(componente.form.valid).toBe(true);
    componente.form.controls.tipoViaje.setValue('OTRO' as 'DIRECTO');
    expect(componente.form.controls.tipoViaje.invalid).toBe(true);
  });

  it('trabaja con nombres e identificadores numéricos del catálogo real simulado', () => {
    preparar();
    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('#ruta-origen')!;
    expect(select.textContent).toContain('Quito');
    expect(select.textContent).toContain('Cuenca');
    expect(select.textContent).not.toContain('Loja');
    select.selectedIndex = 2;
    select.dispatchEvent(new Event('change'));
    expect(componente.form.controls.origenLugarId.value).toBe(22);
    expect(typeof componente.form.controls.origenLugarId.value).toBe('number');
  });

  it('rechaza origen y destino iguales y referencias ajenas al catálogo', () => {
    preparar();
    componente.form.patchValue({ destinoLugarId: 11 });
    expect(componente.form.hasError('lugaresIguales')).toBe(true);
    componente.form.patchValue({ origenLugarId: 999, destinoLugarId: 888 });
    expect(componente.form.hasError('origenInexistente')).toBe(true);
    expect(componente.form.hasError('destinoInexistente')).toBe(true);
  });

  it.each([0, -1, 1.5, NaN, Infinity])('rechaza el identificador numérico inválido %s', id => {
    preparar();
    componente.form.controls.origenLugarId.setValue(id);
    expect(componente.form.controls.origenLugarId.invalid).toBe(true);
  });

  it('envía exclusivamente CrearRutaDto sin valores opcionales inventados', () => {
    preparar();
    const recibido: GuardarRuta[] = [];
    componente.guardarRuta.subscribe(evento => recibido.push(evento));
    componente.form.controls.nombre.setValue(' Quito – Cuenca ');
    componente.guardar();
    expect(recibido).toEqual([{
      modo: 'crear', datos: { nombre: 'Quito – Cuenca', origenLugarId: 11, destinoLugarId: 22, tipoViaje: 'DIRECTO' }
    }]);
  });

  it('precarga edición sin perder false y emite ActualizarRutaDto con el ID original', () => {
    preparar(ruta);
    expect(componente.form.getRawValue()).toEqual({
      nombre: ruta.nombre, origenLugarId: 11, destinoLugarId: 22, tipoViaje: 'CON_PARADAS', activa: false
    });
    const emitir = vi.spyOn(componente.guardarRuta, 'emit');
    componente.guardar();
    const { id, ...datos } = ruta;
    expect(emitir).toHaveBeenCalledExactlyOnceWith({ modo: 'editar', id, datos });
  });

  it('exige lugares activos al crear', () => {
    preparar();
    componente.form.controls.destinoLugarId.setValue(33);
    expect(componente.form.hasError('lugaresInactivos')).toBe(true);
  });

  it('permite conservar extremos inactivos al editar metadatos de una ruta activa', () => {
    preparar({ ...ruta, destinoLugarId: 33, activa: true });
    componente.form.controls.nombre.setValue('Nuevo nombre');
    expect(componente.form.valid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Loja');
  });

  it('permite cambiar extremos a lugares inactivos si la ruta permanece inactiva', () => {
    preparar(ruta);
    componente.form.controls.destinoLugarId.setValue(33);
    expect(componente.form.valid).toBe(true);
  });

  it('exige extremos activos al reactivar aunque no cambien sus identificadores', () => {
    preparar({ ...ruta, destinoLugarId: 33 });
    componente.form.controls.activa.setValue(true);
    expect(componente.form.hasError('lugaresInactivos')).toBe(true);
  });

  it('exige ambos extremos activos si se cambian los extremos de una ruta activa', () => {
    preparar({ ...ruta, origenLugarId: 33, activa: true });
    componente.form.controls.destinoLugarId.setValue(11);
    expect(componente.form.hasError('lugaresInactivos')).toBe(true);
    componente.form.controls.origenLugarId.setValue(22);
    expect(componente.form.valid).toBe(true);
  });

  it('revalida el catálogo actualizado sin perder los datos escritos', () => {
    preparar();
    fixture.componentRef.setInput('lugares', lugares.filter(lugar => lugar.id !== 22));
    fixture.detectChanges();
    expect(componente.form.hasError('destinoInexistente')).toBe(true);
    expect(componente.form.controls.nombre.value).toBe('Quito – Cuenca');
  });

  it('explica los estados sin lugares o con menos de dos activos', () => {
    preparar();
    fixture.componentRef.setInput('lugares', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay lugares disponibles activos');
    fixture.componentRef.setInput('lugares', [lugares[0]]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Se necesitan dos lugares activos distintos');
  });

  it('muestra una referencia faltante en edición sin reemplazarla por otro lugar', () => {
    preparar({ ...ruta, origenLugarId: 999 });
    expect(fixture.nativeElement.textContent).toContain('Lugar #999 (no disponible)');
    expect(componente.form.controls.origenLugarId.value).toBe(999);
    expect(componente.form.invalid).toBe(true);
  });

  it.each(['guardando', 'cargandoLugares', 'errorLugares', 'autorizado'] as const)('impide envíos cuando %s bloquea el formulario', entrada => {
    preparar();
    const emitir = vi.spyOn(componente.guardarRuta, 'emit');
    fixture.componentRef.setInput(entrada, entrada === 'errorLugares' ? 'Error de conexión' : entrada !== 'autorizado');
    fixture.detectChanges();
    componente.guardar();
    componente.guardar();
    expect(emitir).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);
  });

  it('permite reintentar el catálogo y cancelar sin enviar', () => {
    preparar();
    fixture.componentRef.setInput('errorLugares', 'No hay conexión');
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
