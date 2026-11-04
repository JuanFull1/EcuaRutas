import { AfterViewInit, Component, ElementRef, computed, inject, input, OnChanges, OnInit, output, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';

import { LugarDto } from '../lugares/lugar.model';
import { ActualizarRutaParadaDto, CrearRutaParadaDto, RutaParadaDto } from './ruta-parada.model';

export type GuardarParada =
  | { modo: 'crear'; rutaId: number; datos: CrearRutaParadaDto }
  | { modo: 'editar'; rutaId: number; id: number; datos: ActualizarRutaParadaDto };

const entero: ValidatorFn = control =>
  control.value === null || Number.isInteger(control.value) ? null : { entero: true };

const dosDecimales: ValidatorFn = control => {
  const valor: unknown = control.value;
  return valor === null || (typeof valor === 'number' && Number.isFinite(valor) && Number(valor.toFixed(2)) === valor)
    ? null : { decimales: true };
};

@Component({
  selector: 'app-parada-formulario',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './parada-formulario.html',
  styleUrl: './parada-formulario.css'
})
export class ParadaFormulario implements OnInit, OnChanges, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly lugarInput = viewChild<ElementRef<HTMLSelectElement>>('lugarInput');

  readonly rutaId = input<number | null>(null);
  readonly parada = input<RutaParadaDto | null>(null);
  readonly paradas = input<readonly RutaParadaDto[]>([]);
  readonly lugares = input<readonly LugarDto[]>([]);
  readonly cargandoLugares = input(false);
  readonly errorLugares = input<string | null>(null);
  readonly guardando = input(false);
  readonly autorizado = input(false);
  readonly error = input<string | null>(null);
  readonly guardarParada = output<GuardarParada>();
  readonly cancelar = output<void>();
  readonly reintentarLugares = output<void>();
  readonly opcionesLugares = computed(() => this.lugares().filter(lugar =>
    lugar.activo || lugar.id === this.parada()?.lugarId));

  readonly form = this.fb.group({
    lugarId: this.fb.control<number | null>(null, [Validators.required, entero, Validators.min(1)]),
    orden: this.fb.control<number | null>(null, [Validators.required, entero, Validators.min(0), Validators.max(2147483647)]),
    kmAcumulado: this.fb.control<number | null>(null, [dosDecimales, Validators.min(-99999999.99), Validators.max(99999999.99)]),
    minutosAcumulados: this.fb.control<number | null>(null, [entero, Validators.min(-2147483648), Validators.max(2147483647)]),
    permiteAscenso: this.fb.nonNullable.control(false),
    permiteDescenso: this.fb.nonNullable.control(false)
  }, { validators: grupo => {
    const lugarId: number | null = grupo.get('lugarId')?.value ?? null;
    const orden: number | null = grupo.get('orden')?.value ?? null;
    const actual = this.parada();
    const lugar = this.lugares().find(item => item.id === lugarId);
    const otras = this.paradas().filter(item => item.rutaId === this.rutaId() && item.id !== actual?.id);
    const errores: Record<string, boolean> = {};
    if (lugarId !== null && !lugar) errores['lugarInexistente'] = true;
    if (lugar && !lugar.activo && actual?.lugarId !== lugarId) errores['lugarInactivo'] = true;
    if (lugarId !== null && otras.some(item => item.lugarId === lugarId)) errores['lugarDuplicado'] = true;
    if (orden !== null && otras.some(item => item.orden === orden)) errores['ordenDuplicado'] = true;
    return Object.keys(errores).length ? errores : null;
  }});

  ngOnChanges(): void {
    this.form.updateValueAndValidity();
  }

  ngOnInit(): void {
    const parada = this.parada();
    if (parada !== null) this.form.reset({
      lugarId: parada.lugarId,
      orden: parada.orden,
      kmAcumulado: parada.kmAcumulado,
      minutosAcumulados: parada.minutosAcumulados,
      permiteAscenso: parada.permiteAscenso,
      permiteDescenso: parada.permiteDescenso
    });
  }

  ngAfterViewInit(): void {
    this.lugarInput()?.nativeElement.focus();
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.dirty || control.touched);
  }

  errorCampo(error: string, campo: keyof typeof this.form.controls): boolean {
    return this.form.hasError(error) && this.form.controls[campo].touched;
  }

  existeLugar(id: number): boolean {
    return this.lugares().some(lugar => lugar.id === id);
  }

  guardar(): void {
    if (!this.autorizado() || this.guardando() || this.cargandoLugares() || this.errorLugares()) return;
    this.form.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const rutaId = this.rutaId();
    const parada = this.parada();
    const valor = this.form.getRawValue();
    if (rutaId === null || !Number.isInteger(rutaId) || rutaId <= 0 || valor.lugarId === null || valor.orden === null ||
      (parada !== null && parada.rutaId !== rutaId)) return;
    const datos: CrearRutaParadaDto = {
      lugarId: valor.lugarId,
      orden: valor.orden,
      kmAcumulado: valor.kmAcumulado,
      minutosAcumulados: valor.minutosAcumulados,
      permiteAscenso: valor.permiteAscenso,
      permiteDescenso: valor.permiteDescenso
    };
    this.guardarParada.emit(parada === null
      ? { modo: 'crear', rutaId, datos }
      : { modo: 'editar', rutaId, id: parada.id, datos });
  }
}
