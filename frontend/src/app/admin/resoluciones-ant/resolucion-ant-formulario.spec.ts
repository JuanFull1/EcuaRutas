import { TestBed } from '@angular/core/testing';
import { GuardarResolucionAnt, ResolucionAntFormulario } from './resolucion-ant-formulario';
import { ResolucionAntDto } from './resolucion-ant.model';

describe('ResolucionAntFormulario', () => {
  const actual: ResolucionAntDto = { id: 7, cooperativaId: 4, numeroResolucion: ' ANT-01 ', fechaResolucion: null, archivoUrl: null, activa: false };
  const crear = (resolucion: ResolucionAntDto | null = null) => {
    const fixture = TestBed.createComponent(ResolucionAntFormulario);
    fixture.componentRef.setInput('resolucion', resolucion);
    fixture.componentRef.setInput('cooperativas', [{ id: 4, nombre: 'Cooperativa de prueba' }]);
    fixture.componentRef.setInput('autorizado', true);
    fixture.detectChanges(); return fixture;
  };
  beforeEach(() => TestBed.configureTestingModule({}));

  it('renderiza campos opcionales y valida los obligatorios', () => {
    const fixture = crear(); const componente = fixture.componentInstance; const emitir = vi.fn();
    componente.guardarResolucion.subscribe(emitir); componente.guardar(); fixture.detectChanges();
    expect(componente.form.invalid).toBe(true); expect(emitir).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.invalid-feedback').length).toBeGreaterThan(0);
    componente.form.patchValue({ cooperativaId: 4, numeroResolucion: 'ANT-01' }); expect(componente.form.valid).toBe(true);
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('rechaza el identificador %s', id => {
    const componente = crear().componentInstance; componente.form.patchValue({ cooperativaId: id, numeroResolucion: 'ANT' });
    expect(componente.form.invalid).toBe(true);
  });

  it('respeta máximos de 100 y 500 caracteres sin patrones jurídicos', () => {
    const componente = crear().componentInstance;
    componente.form.patchValue({ cooperativaId: 4, numeroResolucion: 'A'.repeat(100), archivoUrl: 'x'.repeat(500) });
    expect(componente.form.valid).toBe(true);
    componente.form.controls.numeroResolucion.setValue('A'.repeat(101)); expect(componente.form.invalid).toBe(true);
    componente.form.controls.numeroResolucion.setValue('ANT libre / 2026');
    componente.form.controls.archivoUrl.setValue('x'.repeat(501)); expect(componente.form.invalid).toBe(true);
    componente.form.controls.archivoUrl.setValue(''); expect(componente.form.valid).toBe(true);
    componente.form.controls.numeroResolucion.setValue('   '); expect(componente.form.invalid).toBe(true);
  });

  it('emite creación con número literal y opcionales nulos', () => {
    const componente = crear().componentInstance; const emitir = vi.fn(); componente.guardarResolucion.subscribe(emitir);
    componente.form.patchValue({ cooperativaId: 4, numeroResolucion: ' ANT-01 ' }); componente.guardar();
    expect(emitir).toHaveBeenCalledWith({ modo: 'crear', datos: { cooperativaId: 4, numeroResolucion: ' ANT-01 ', fechaResolucion: null, archivoUrl: null } });
  });

  it('conserva null, cadena vacía, identificadores y estado false al editar', () => {
    const componente = crear(actual).componentInstance; const emitir = vi.fn(); componente.guardarResolucion.subscribe(emitir);
    componente.guardar();
    expect(emitir).toHaveBeenCalledWith({ modo: 'editar', id: 7, datos: { cooperativaId: 4, numeroResolucion: ' ANT-01 ', fechaResolucion: null, archivoUrl: null, activa: false } });
    componente.form.patchValue({ archivoUrl: '', fechaResolucion: '' }); componente.guardar();
    const evento = emitir.mock.calls[1][0] as GuardarResolucionAnt;
    expect(evento.datos.archivoUrl).toBe(''); expect(evento.datos.fechaResolucion).toBeNull();
  });

  it.each(['0001-01-01', '2024-02-29', '2026-11-04', '9999-12-31'])('conserva la fecha civil %s', fecha => {
    const componente = crear(actual).componentInstance; const emitir = vi.fn(); componente.guardarResolucion.subscribe(emitir);
    componente.form.controls.fechaResolucion.setValue(fecha); componente.guardar();
    expect(emitir.mock.calls[0][0].datos.fechaResolucion).toBe(fecha);
  });

  it.each(['2026-02-29', '2026-13-01', '0000-01-01', '10000-01-01', '2026-11-04T00:00:00Z'])('rechaza fechas fuera de DateOnly: %s', fecha => {
    const componente = crear(actual).componentInstance; componente.form.controls.fechaResolucion.setValue(fecha);
    expect(componente.form.controls.fechaResolucion.invalid).toBe(true);
  });

  it('permite conservar una cooperativa fuera del catálogo y rechaza cambiar a otra desconocida', () => {
    const fixture = crear({ ...actual, cooperativaId: 99 }); const componente = fixture.componentInstance;
    expect(componente.form.valid).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cooperativa #99');
    componente.form.controls.cooperativaId.setValue(98); expect(componente.form.invalid).toBe(true);
  });

  it('permite editar la resolución conservando su cooperativa si falla el catálogo', () => {
    const fixture = crear({ ...actual, cooperativaId: 99 }); const componente = fixture.componentInstance;
    const emitir = vi.fn(); componente.guardarResolucion.subscribe(emitir);
    fixture.componentRef.setInput('errorCooperativas', 'Sin conexión al catálogo'); fixture.detectChanges();
    componente.form.controls.numeroResolucion.setValue('ANT editada'); componente.guardar();
    expect(emitir).toHaveBeenCalledWith({ modo: 'editar', id: 7, datos: {
      cooperativaId: 99, numeroResolucion: 'ANT editada', fechaResolucion: null, archivoUrl: null, activa: false
    } });
  });

  it('bloquea guardar sin permiso, durante carga o guardado y con catálogo fallido en creación', () => {
    const fixture = crear(); const componente = fixture.componentInstance; const emitir = vi.fn();
    componente.guardarResolucion.subscribe(emitir); componente.form.patchValue({ cooperativaId: 4, numeroResolucion: 'ANT' });
    fixture.componentRef.setInput('autorizado', false); componente.guardar();
    fixture.componentRef.setInput('autorizado', true); fixture.componentRef.setInput('guardando', true); componente.guardar();
    fixture.componentRef.setInput('guardando', false); fixture.componentRef.setInput('cargandoCooperativas', true); componente.guardar();
    fixture.componentRef.setInput('cargandoCooperativas', false); fixture.componentRef.setInput('errorCooperativas', 'Sin conexión'); componente.guardar();
    expect(emitir).not.toHaveBeenCalled();
  });

  it('revalida cuando el catálogo cambia sin perder los valores editados', () => {
    const fixture = crear(); const componente = fixture.componentInstance;
    componente.form.patchValue({ cooperativaId: 4, numeroResolucion: 'ANT nuevo' });
    fixture.componentRef.setInput('cooperativas', []); fixture.detectChanges();
    expect(componente.form.hasError('cooperativaNoDisponible')).toBe(true);
    expect(componente.form.controls.numeroResolucion.value).toBe('ANT nuevo');
  });
});
