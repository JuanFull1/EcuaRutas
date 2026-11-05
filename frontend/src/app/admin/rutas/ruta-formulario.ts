import {
  AfterViewInit, Component, ElementRef, computed, inject, input, OnChanges, OnInit, output, viewChild
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';

import { LugarDto } from '../lugares/lugar.model';
import { ActualizarRutaDto, CrearRutaDto, RutaDto, TipoViaje } from './ruta.model';

export type GuardarRuta =
  | { modo: 'crear'; datos: CrearRutaDto }
  | { modo: 'editar'; id: number; datos: ActualizarRutaDto };

const nombreRequerido: ValidatorFn = control =>
  typeof control.value === 'string' && control.value.trim() !== '' ? null : { required: true };

const identificadorValido: ValidatorFn = control =>
  control.value === null || (Number.isInteger(control.value) && control.value > 0)
    ? null : { identificador: true };

@Component({
  selector: 'app-ruta-formulario',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './ruta-formulario.html',
  styleUrl: './ruta-formulario.css'
})
export class RutaFormulario implements OnInit, OnChanges, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly nombreInput = viewChild<ElementRef<HTMLInputElement>>('nombreInput');

  readonly ruta = input<RutaDto | null>(null);
  readonly lugares = input<readonly LugarDto[]>([]);
  readonly cargandoLugares = input(false);
  readonly errorLugares = input<string | null>(null);
  readonly autorizado = input(false);
  readonly guardando = input(false);
  readonly error = input<string | null>(null);
  readonly guardarRuta = output<GuardarRuta>();
  readonly cancelar = output<void>();
  readonly reintentarLugares = output<void>();
  readonly tipos: TipoViaje[] = ['DIRECTO', 'CON_PARADAS'];
  readonly opcionesLugares = computed(() => this.ruta() === null
    ? this.lugares().filter(lugar => lugar.activo)
    : this.lugares());

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control('', [nombreRequerido, Validators.maxLength(200)]),
    origenLugarId: this.fb.control<number | null>(null, [Validators.required, identificadorValido]),
    destinoLugarId: this.fb.control<number | null>(null, [Validators.required, identificadorValido]),
    tipoViaje: this.fb.nonNullable.control<TipoViaje | ''>('', [Validators.required, Validators.pattern(/^(DIRECTO|CON_PARADAS)$/)]),
    activa: this.fb.nonNullable.control(false)
  }, { validators: grupo => {
    const origenId: number | null = grupo.get('origenLugarId')?.value ?? null;
    const destinoId: number | null = grupo.get('destinoLugarId')?.value ?? null;
    const errores: Record<string, boolean> = {};
    if (origenId !== null && origenId === destinoId) errores['lugaresIguales'] = true;
    const origen = this.lugares().find(lugar => lugar.id === origenId);
    const destino = this.lugares().find(lugar => lugar.id === destinoId);
    if (origenId !== null && !origen) errores['origenInexistente'] = true;
    if (destinoId !== null && !destino) errores['destinoInexistente'] = true;
    const ruta = this.ruta();
    const exigirActivos = ruta === null || (grupo.get('activa')?.value === true &&
      (!ruta.activa || ruta.origenLugarId !== origenId || ruta.destinoLugarId !== destinoId));
    if (exigirActivos && ((origen && !origen.activo) || (destino && !destino.activo))) {
      errores['lugaresInactivos'] = true;
    }
    return Object.keys(errores).length ? errores : null;
  }});

  ngOnChanges(): void {
    // Revalida las referencias si se vuelve a consultar el catálogo mientras el formulario está abierto.
    this.form.updateValueAndValidity();
  }

  ngOnInit(): void {
    const ruta = this.ruta();
    if (ruta !== null) this.form.reset({
      nombre: ruta.nombre,
      origenLugarId: ruta.origenLugarId,
      destinoLugarId: ruta.destinoLugarId,
      tipoViaje: ruta.tipoViaje,
      activa: ruta.activa
    });
  }

  ngAfterViewInit(): void {
    this.nombreInput()?.nativeElement.focus();
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.dirty || control.touched);
  }

  errorExtremos(error: string): boolean {
    return this.form.hasError(error) &&
      (this.form.controls.origenLugarId.touched || this.form.controls.destinoLugarId.touched || this.form.controls.activa.touched);
  }

  existeLugar(id: number): boolean {
    return this.lugares().some(lugar => lugar.id === id);
  }

  guardar(): void {
    if (this.guardando() || !this.autorizado() || this.cargandoLugares() || this.errorLugares()) return;
    this.form.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = this.form.getRawValue();
    if (valor.origenLugarId === null || valor.destinoLugarId === null || valor.tipoViaje === '') return;
    const datos: CrearRutaDto = {
      nombre: valor.nombre.trim(),
      origenLugarId: valor.origenLugarId,
      destinoLugarId: valor.destinoLugarId,
      tipoViaje: valor.tipoViaje
    };
    const ruta = this.ruta();
    this.guardarRuta.emit(ruta === null
      ? { modo: 'crear', datos }
      : { modo: 'editar', id: ruta.id, datos: { ...datos, activa: valor.activa } });
  }
}
