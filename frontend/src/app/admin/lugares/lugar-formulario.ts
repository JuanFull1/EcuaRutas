import { AfterViewInit, Component, ElementRef, inject, input, OnInit, output, viewChild } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { ActualizarLugarDto, CrearLugarDto, LugarDto, TipoLugar } from './lugar.model';

export type GuardarLugar =
  | { modo: 'crear'; datos: CrearLugarDto }
  | { modo: 'editar'; id: number; datos: ActualizarLugarDto };

const nombreRequerido: ValidatorFn = control =>
  typeof control.value === 'string' && control.value.trim().length > 0 ? null : { required: true };

const numeroFinito: ValidatorFn = control =>
  control.value === null || (typeof control.value === 'number' && Number.isFinite(control.value))
    ? null : { numero: true };

const coordenadasCompletas: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const latitud = grupo.get('latitud')?.value;
  const longitud = grupo.get('longitud')?.value;
  return (latitud == null) === (longitud == null) ? null : { coordenadasIncompletas: true };
};

@Component({
  selector: 'app-lugar-formulario',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './lugar-formulario.html',
  styleUrl: './lugar-formulario.css'
})
export class LugarFormulario implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly nombreInput = viewChild<ElementRef<HTMLInputElement>>('nombreInput');

  readonly lugar = input<LugarDto | null>(null);
  readonly guardando = input(false);
  readonly autorizado = input(false);
  readonly error = input<string | null>(null);
  readonly guardarLugar = output<GuardarLugar>();
  readonly cancelar = output<void>();
  readonly tipos: TipoLugar[] = ['CIUDAD', 'TERMINAL', 'PARADA'];

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control('', [nombreRequerido, Validators.maxLength(150)]),
    provincia: this.fb.nonNullable.control('', Validators.maxLength(100)),
    canton: this.fb.nonNullable.control('', Validators.maxLength(100)),
    tipo: this.fb.nonNullable.control<TipoLugar | ''>('', [Validators.required, Validators.pattern(/^(CIUDAD|TERMINAL|PARADA)$/)]),
    latitud: this.fb.control<number | null>(null, [numeroFinito, Validators.min(-90), Validators.max(90)]),
    longitud: this.fb.control<number | null>(null, [numeroFinito, Validators.min(-180), Validators.max(180)]),
    activo: this.fb.nonNullable.control(false)
  }, { validators: coordenadasCompletas });

  ngOnInit(): void {
    const lugar = this.lugar();
    if (lugar !== null) {
      this.form.reset({
        nombre: lugar.nombre,
        provincia: lugar.provincia ?? '',
        canton: lugar.canton ?? '',
        tipo: lugar.tipo,
        latitud: lugar.ubicacion?.latitud ?? null,
        longitud: lugar.ubicacion?.longitud ?? null,
        activo: lugar.activo
      });
    }
  }

  ngAfterViewInit(): void {
    this.nombreInput()?.nativeElement.focus();
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  coordenadasIncompletas(): boolean {
    return this.form.hasError('coordenadasIncompletas') &&
      (this.form.controls.latitud.touched || this.form.controls.longitud.touched);
  }

  guardar(): void {
    if (this.guardando() || !this.autorizado()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();
    const datos: CrearLugarDto = {
      nombre: valor.nombre.trim(),
      provincia: valor.provincia.trim() || null,
      canton: valor.canton.trim() || null,
      tipo: valor.tipo as TipoLugar,
      ubicacion: valor.latitud === null || valor.longitud === null ? null : {
        latitud: valor.latitud,
        longitud: valor.longitud
      }
    };
    const lugar = this.lugar();
    this.guardarLugar.emit(lugar === null
      ? { modo: 'crear', datos }
      : { modo: 'editar', id: lugar.id, datos: { ...datos, activo: valor.activo } });
  }
}
