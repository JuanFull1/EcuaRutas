import { AfterViewInit, Component, ElementRef, OnChanges, OnInit, inject, input, output, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';

import { CooperativaResumen } from '../../models/admin-usuario.model';
import { ActualizarResolucionAntDto, CrearResolucionAntDto, ResolucionAntDto } from './resolucion-ant.model';

export type GuardarResolucionAnt =
  | { modo: 'crear'; datos: CrearResolucionAntDto }
  | { modo: 'editar'; id: number; datos: ActualizarResolucionAntDto };

const numeroRequerido: ValidatorFn = control =>
  typeof control.value === 'string' && control.value.trim() !== '' ? null : { required: true };

const identificadorPositivo: ValidatorFn = control => control.value === null ||
  (Number.isSafeInteger(control.value) && control.value > 0) ? null : { identificador: true };

const fechaDateOnly: ValidatorFn = control => {
  const valor: unknown = control.value;
  if (valor === null || valor === '') return null;
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return { fecha: true };
  const [anio, mes, dia] = valor.split('-').map(Number);
  const bisiesto = anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0);
  const dias = [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return anio >= 1 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= dias[mes - 1] ? null : { fecha: true };
};

@Component({
  selector: 'app-resolucion-ant-formulario',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './resolucion-ant-formulario.html',
  styles: ':host { display: block; min-width: 0; } fieldset { min-width: 0; }'
})
export class ResolucionAntFormulario implements OnInit, OnChanges, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly numeroInput = viewChild<ElementRef<HTMLInputElement>>('numeroInput');

  readonly resolucion = input<ResolucionAntDto | null>(null);
  readonly cooperativas = input<readonly CooperativaResumen[]>([]);
  readonly cargandoCooperativas = input(false);
  readonly errorCooperativas = input<string | null>(null);
  readonly autorizado = input(false);
  readonly guardando = input(false);
  readonly error = input<string | null>(null);
  readonly guardarResolucion = output<GuardarResolucionAnt>();
  readonly cancelar = output<void>();
  readonly reintentarCooperativas = output<void>();

  readonly form = this.fb.group({
    cooperativaId: this.fb.control<number | null>(null, [Validators.required, identificadorPositivo]),
    numeroResolucion: this.fb.nonNullable.control('', [numeroRequerido, Validators.maxLength(100)]),
    fechaResolucion: this.fb.control<string | null>(null, fechaDateOnly),
    archivoUrl: this.fb.control<string | null>(null, Validators.maxLength(500))
  }, { validators: grupo => {
    const id: number | null = grupo.get('cooperativaId')?.value ?? null;
    return id !== null && id !== this.resolucion()?.cooperativaId && !this.existeCooperativa(id)
      ? { cooperativaNoDisponible: true } : null;
  } });

  ngOnChanges(): void { this.form.updateValueAndValidity(); }

  ngOnInit(): void {
    const actual = this.resolucion();
    if (actual) this.form.reset({
      cooperativaId: actual.cooperativaId, numeroResolucion: actual.numeroResolucion,
      fechaResolucion: actual.fechaResolucion, archivoUrl: actual.archivoUrl
    });
  }

  ngAfterViewInit(): void { this.numeroInput()?.nativeElement.focus(); }

  existeCooperativa(id: number): boolean { return this.cooperativas().some(c => c.id === id); }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  guardar(): void {
    if (!this.autorizado() || this.guardando() || this.cargandoCooperativas() ||
        (this.errorCooperativas() && this.resolucion() === null)) return;
    this.form.updateValueAndValidity();
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const valor = this.form.getRawValue();
    if (valor.cooperativaId === null) return;
    const datos: CrearResolucionAntDto = {
      cooperativaId: valor.cooperativaId,
      // El backend conserva literalmente este número y su clave única.
      numeroResolucion: valor.numeroResolucion,
      fechaResolucion: valor.fechaResolucion === '' ? null : valor.fechaResolucion,
      archivoUrl: valor.archivoUrl
    };
    const actual = this.resolucion();
    this.guardarResolucion.emit(actual === null ? { modo: 'crear', datos }
      : { modo: 'editar', id: actual.id, datos: { ...datos, activa: actual.activa } });
  }
}
