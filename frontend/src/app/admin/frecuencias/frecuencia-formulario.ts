import { AfterViewInit, Component, DestroyRef, ElementRef, OnChanges, OnInit, inject, input, output, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { CooperativaResumen } from '../../models/admin-usuario.model';
import { RutaDto } from '../rutas/ruta.model';
import { ResolucionAntDto } from '../resoluciones-ant/resolucion-ant.model';
import { ActualizarFrecuenciaDto, CrearFrecuenciaDto, FrecuenciaDto, cambiaEstructura, horaParaApi } from './frecuencia.model';

export type GuardarFrecuencia = { modo: 'crear'; datos: CrearFrecuenciaDto }
  | { modo: 'editar'; id: number; datos: ActualizarFrecuenciaDto };

const idPositivo: ValidatorFn = control => control.value === null ||
  (Number.isSafeInteger(control.value) && control.value > 0) ? null : { identificador: true };

@Component({
  selector: 'app-frecuencia-formulario', standalone: true, imports: [ReactiveFormsModule],
  templateUrl: './frecuencia-formulario.html',
  styles: ':host { display: block; min-width: 0; } fieldset { min-width: 0; }'
})
export class FrecuenciaFormulario implements OnInit, OnChanges, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly codigoInput = viewChild<ElementRef<HTMLInputElement>>('codigoInput');
  readonly frecuencia = input<FrecuenciaDto | null>(null);
  readonly cooperativas = input<readonly CooperativaResumen[]>([]);
  readonly rutas = input<readonly RutaDto[]>([]);
  readonly resoluciones = input<readonly ResolucionAntDto[]>([]);
  readonly cargandoCatalogos = input(false);
  readonly erroresCatalogos = input<readonly string[]>([]);
  readonly autorizado = input(false);
  readonly guardando = input(false);
  readonly error = input<string | null>(null);
  readonly guardarFrecuencia = output<GuardarFrecuencia>();
  readonly cancelar = output<void>();
  readonly reintentarCatalogos = output<void>();

  readonly form = this.fb.group({
    cooperativaId: this.fb.control<number | null>(null, [Validators.required, idPositivo]),
    rutaId: this.fb.control<number | null>(null, [Validators.required, idPositivo]),
    resolucionAntId: this.fb.control<number | null>(null, [Validators.required, idPositivo]),
    codigo: this.fb.control<string | null>(null, Validators.maxLength(50)),
    horaSalida: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^(?:[01]\d|2[0-3]):[0-5]\d$/)])
  }, { validators: grupo => this.validarReferencias(grupo) });

  ngOnInit(): void {
    const actual = this.frecuencia();
    if (actual) this.form.reset({ cooperativaId: actual.cooperativaId, rutaId: actual.rutaId,
      resolucionAntId: actual.resolucionAntId, codigo: actual.codigo, horaSalida: actual.horaSalida.slice(0, 5) });
    this.form.controls.cooperativaId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.sincronizarResolucion());
  }
  ngOnChanges(): void { this.form.updateValueAndValidity(); }
  ngAfterViewInit(): void { this.codigoInput()?.nativeElement.focus(); }

  existeCooperativa(id: number): boolean { return this.cooperativas().some(c => c.id === id); }
  existeRuta(id: number): boolean { return this.rutas().some(r => r.id === id); }
  existeResolucion(id: number): boolean { return this.resoluciones().some(r => r.id === id); }

  rutasDisponibles(): readonly RutaDto[] {
    return this.rutas().filter(r => r.activa || this.frecuencia()?.activa === false || r.id === this.frecuencia()?.rutaId);
  }
  resolucionesDisponibles(): ResolucionAntDto[] {
    return this.resoluciones().filter(r => r.cooperativaId === this.form.controls.cooperativaId.value &&
      (r.activa || this.frecuencia()?.activa === false || r.id === this.frecuencia()?.resolucionAntId))
      .sort((a, b) => Number(b.activa) - Number(a.activa) || a.numeroResolucion.localeCompare(b.numeroResolucion));
  }
  private sincronizarResolucion(): void {
    const { cooperativaId, resolucionAntId } = this.form.getRawValue();
    const referencia = this.resoluciones().find(r => r.id === resolucionAntId);
    const actual = this.frecuencia();
    const compatible = referencia ? referencia.cooperativaId === cooperativaId
      : actual?.cooperativaId === cooperativaId && actual?.resolucionAntId === resolucionAntId;
    if (resolucionAntId !== null && !compatible) this.form.controls.resolucionAntId.setValue(null);
    // La ruta no depende de la cooperativa en el modelo actual.
  }

  private validarReferencias(grupo: AbstractControl): Record<string, boolean> | null {
    const coop: number | null = grupo.get('cooperativaId')?.value ?? null;
    const rutaId: number | null = grupo.get('rutaId')?.value ?? null;
    const resolucionId: number | null = grupo.get('resolucionAntId')?.value ?? null;
    const hora: string = grupo.get('horaSalida')?.value ?? '';
    const actual = this.frecuencia();
    const estructuraOriginal = !!actual && actual.cooperativaId === coop && actual.rutaId === rutaId &&
      actual.resolucionAntId === resolucionId && actual.horaSalida.slice(0, 5) === hora;
    const exigirActivas = actual === null || (actual.activa && !estructuraOriginal);
    const ruta = this.rutas().find(r => r.id === rutaId);
    const resolucion = this.resoluciones().find(r => r.id === resolucionId);
    const errores: Record<string, boolean> = {};
    if (coop !== null && !this.existeCooperativa(coop) && (exigirActivas || coop !== actual?.cooperativaId)) errores['cooperativaNoDisponible'] = true;
    if (rutaId !== null && !ruta && (exigirActivas || rutaId !== actual?.rutaId)) errores['rutaNoDisponible'] = true;
    if (resolucionId !== null && !resolucion && (exigirActivas || resolucionId !== actual?.resolucionAntId || coop !== actual?.cooperativaId)) errores['resolucionNoDisponible'] = true;
    if (resolucion && resolucion.cooperativaId !== coop) errores['resolucionAjena'] = true;
    if (exigirActivas && ((ruta && !ruta.activa) || (resolucion && !resolucion.activa))) errores['referenciasInactivas'] = true;
    return Object.keys(errores).length ? errores : null;
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo]; return control.invalid && (control.touched || control.dirty);
  }
  guardar(): void {
    if (!this.autorizado() || this.guardando() || this.cargandoCatalogos()) return;
    this.form.updateValueAndValidity();
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const valor = this.form.getRawValue();
    if (valor.cooperativaId === null || valor.rutaId === null || valor.resolucionAntId === null) return;
    const actual = this.frecuencia();
    const datos: CrearFrecuenciaDto = { cooperativaId: valor.cooperativaId, rutaId: valor.rutaId,
      resolucionAntId: valor.resolucionAntId, codigo: valor.codigo, horaSalida: horaParaApi(valor.horaSalida, actual) };
    if (this.erroresCatalogos().length && (!actual || cambiaEstructura(actual, datos))) return;
    this.guardarFrecuencia.emit(actual ? { modo: 'editar', id: actual.id, datos: { ...datos, activa: actual.activa } }
      : { modo: 'crear', datos });
  }
}
