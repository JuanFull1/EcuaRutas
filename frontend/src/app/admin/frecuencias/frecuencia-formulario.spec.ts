import { TestBed } from '@angular/core/testing';
import { RutaDto } from '../rutas/ruta.model';
import { ResolucionAntDto } from '../resoluciones-ant/resolucion-ant.model';
import { FrecuenciaFormulario } from './frecuencia-formulario';
import { FrecuenciaDto } from './frecuencia.model';

describe('FrecuenciaFormulario', () => {
  const ruta: RutaDto = { id: 2, nombre: 'Quito – Cuenca', origenLugarId: 11, destinoLugarId: 22, tipoViaje: 'DIRECTO', activa: true };
  const resolucion: ResolucionAntDto = { id: 3, cooperativaId: 4, numeroResolucion: 'ANT-01', fechaResolucion: null, archivoUrl: null, activa: true };
  const actual: FrecuenciaDto = { id: 7, cooperativaId: 4, rutaId: 2, resolucionAntId: 3, codigo: null, horaSalida: '00:00:00', activa: false };
  beforeEach(() => TestBed.configureTestingModule({}));
  const crear = (frecuencia: FrecuenciaDto | null = null) => {
    const fixture = TestBed.createComponent(FrecuenciaFormulario);
    fixture.componentRef.setInput('frecuencia', frecuencia); fixture.componentRef.setInput('autorizado', true);
    fixture.componentRef.setInput('cooperativas', [{ id: 4, nombre: 'Cooperativa A' }, { id: 5, nombre: 'Cooperativa B' }]);
    fixture.componentRef.setInput('rutas', [ruta, { ...ruta, id: 20, activa: false }]);
    fixture.componentRef.setInput('resoluciones', [resolucion, { ...resolucion, id: 30, activa: false }, { ...resolucion, id: 31, cooperativaId: 5 }]);
    fixture.detectChanges(); return fixture;
  };
  const completar = (componente: FrecuenciaFormulario) => componente.form.patchValue({ cooperativaId: 4, rutaId: 2, resolucionAntId: 3, horaSalida: '00:00' });

  it('valida campos obligatorios y representa 00:00 como hora válida', () => {
    const fixture = crear(); const componente = fixture.componentInstance; const emitir = vi.fn(); componente.guardarFrecuencia.subscribe(emitir);
    componente.guardar(); fixture.detectChanges(); expect(componente.form.invalid).toBe(true); expect(emitir).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.invalid-feedback').length).toBeGreaterThan(0);
    completar(componente); expect(componente.form.valid).toBe(true); componente.guardar();
    expect(emitir).toHaveBeenCalledWith({ modo: 'crear', datos: { cooperativaId: 4, rutaId: 2, resolucionAntId: 3, codigo: null, horaSalida: '00:00:00' } });
  });
  it.each(['cooperativaId', 'rutaId', 'resolucionAntId'] as const)('rechaza identificadores no positivos en %s', campo => {
    const componente = crear().componentInstance; completar(componente);
    for (const id of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) { componente.form.controls[campo].setValue(id); expect(componente.form.controls[campo].invalid).toBe(true); }
  });
  it.each(['', '24:00', '12:60', '1:00', '12:30:00', 'texto'])('rechaza la hora no compatible con HH:mm: %s', hora => {
    const componente = crear().componentInstance; completar(componente); componente.form.controls.horaSalida.setValue(hora); expect(componente.form.invalid).toBe(true);
  });
  it('admite código null, vacío y de 50 caracteres, sin imponer unicidad', () => {
    const componente = crear().componentInstance; completar(componente);
    for (const codigo of [null, '', 'C'.repeat(50)]) { componente.form.controls.codigo.setValue(codigo); expect(componente.form.valid).toBe(true); }
    componente.form.controls.codigo.setValue('C'.repeat(51)); expect(componente.form.invalid).toBe(true);
  });
  it('filtra resoluciones por cooperativa y no asocia rutas a cooperativas', () => {
    const componente = crear().componentInstance; completar(componente);
    expect(componente.resolucionesDisponibles().map(r => r.id)).toEqual([3]);
    componente.form.controls.cooperativaId.setValue(5);
    expect(componente.form.controls.resolucionAntId.value).toBeNull(); expect(componente.form.controls.rutaId.value).toBe(2);
    expect(componente.resolucionesDisponibles().map(r => r.id)).toEqual([31]);
    componente.form.controls.resolucionAntId.setValue(31); expect(componente.form.valid).toBe(true);
    componente.form.controls.cooperativaId.setValue(5); expect(componente.form.controls.resolucionAntId.value).toBe(31);
  });
  it('rechaza una resolución de otra cooperativa aun asignada directamente', () => {
    const componente = crear().componentInstance; completar(componente); componente.form.controls.resolucionAntId.setValue(31);
    const emitir = vi.fn(); componente.guardarFrecuencia.subscribe(emitir); componente.guardar();
    expect(componente.form.hasError('resolucionAjena')).toBe(true); expect(emitir).not.toHaveBeenCalled();
  });
  it('informa cuando una cooperativa no tiene resoluciones disponibles', () => {
    const fixture = crear(); fixture.componentInstance.form.controls.cooperativaId.setValue(4);
    fixture.componentRef.setInput('resoluciones', []); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay resoluciones disponibles');
  });
  it('conserva referencias inactivas originales para editar código de una frecuencia activa', () => {
    const fixture = crear({ ...actual, activa: true }); const componente = fixture.componentInstance;
    fixture.componentRef.setInput('cooperativas', []); fixture.componentRef.setInput('rutas', [{ ...ruta, activa: false }]);
    fixture.componentRef.setInput('resoluciones', [{ ...resolucion, activa: false }]); fixture.detectChanges();
    componente.form.controls.codigo.setValue('Código nuevo'); expect(componente.form.valid).toBe(true);
    expect(componente.resolucionesDisponibles()[0].activa).toBe(false);
    componente.form.controls.horaSalida.setValue('01:00'); expect(componente.form.invalid).toBe(true);
  });
  it('permite referencias inactivas en cambios de una frecuencia inactiva como el backend', () => {
    const componente = crear(actual).componentInstance; componente.form.patchValue({ rutaId: 20, resolucionAntId: 30, horaSalida: '01:00' });
    expect(componente.form.valid).toBe(true);
    const emitir = vi.fn(); componente.guardarFrecuencia.subscribe(emitir); componente.guardar();
    expect(emitir.mock.calls[0][0].datos.activa).toBe(false);
  });
  it('el alta exige ruta y resolución activas', () => {
    const componente = crear().componentInstance; completar(componente); componente.form.patchValue({ rutaId: 20, resolucionAntId: 30 });
    expect(componente.form.hasError('referenciasInactivas')).toBe(true);
  });
  it.each(['00:00:00', '12:34:56', '23:59:59.1234567'])('edita sin perder precisión de %s ni false/null', horaSalida => {
    const componente = crear({ ...actual, horaSalida }).componentInstance; const emitir = vi.fn(); componente.guardarFrecuencia.subscribe(emitir);
    expect(componente.form.controls.horaSalida.value).toBe(horaSalida.slice(0, 5)); componente.guardar();
    expect(emitir).toHaveBeenCalledWith({ modo: 'editar', id: 7, datos: { cooperativaId: 4, rutaId: 2, resolucionAntId: 3, codigo: null, horaSalida, activa: false } });
    componente.form.patchValue({ horaSalida: '22:10', codigo: '' }); componente.guardar();
    expect(emitir.mock.calls[1][0].datos.horaSalida).toBe('22:10:00'); expect(emitir.mock.calls[1][0].datos.codigo).toBe('');
  });
  it('permite metadatos históricos con catálogo fallido pero bloquea cambios estructurales', () => {
    const fixture = crear(actual); const componente = fixture.componentInstance; const emitir = vi.fn(); componente.guardarFrecuencia.subscribe(emitir);
    fixture.componentRef.setInput('erroresCatalogos', ['No se pudo cargar rutas']); componente.guardar();
    expect(emitir).toHaveBeenCalledOnce(); componente.form.controls.horaSalida.setValue('01:00'); componente.guardar(); expect(emitir).toHaveBeenCalledOnce();
  });
  it('bloquea envíos sin permiso, mientras carga o guarda y con catálogos fallidos en alta', () => {
    const fixture = crear(); const componente = fixture.componentInstance; completar(componente); const emitir = vi.fn(); componente.guardarFrecuencia.subscribe(emitir);
    fixture.componentRef.setInput('autorizado', false); componente.guardar();
    fixture.componentRef.setInput('autorizado', true); fixture.componentRef.setInput('guardando', true); componente.guardar();
    fixture.componentRef.setInput('guardando', false); fixture.componentRef.setInput('cargandoCatalogos', true); componente.guardar();
    fixture.componentRef.setInput('cargandoCatalogos', false); fixture.componentRef.setInput('erroresCatalogos', ['Sin conexión']); componente.guardar(); expect(emitir).not.toHaveBeenCalled();
  });
  it('revalida los cambios del catálogo sin borrar código ni ruta', () => {
    const fixture = crear(); const componente = fixture.componentInstance; completar(componente);
    componente.form.controls.codigo.setValue('Conservar'); fixture.componentRef.setInput('resoluciones', [{ ...resolucion, cooperativaId: 5 }]); fixture.detectChanges();
    expect(componente.form.hasError('resolucionAjena')).toBe(true); expect(componente.form.controls.codigo.value).toBe('Conservar'); expect(componente.form.controls.rutaId.value).toBe(2);
  });
});
