import { AfterViewInit, Component, DestroyRef, ElementRef, OnChanges, OnInit, inject, input, output, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { FrecuenciaDto } from '../frecuencias/frecuencia.model';
import { LugarDto } from '../lugares/lugar.model';
import { RutaParadaDto } from '../paradas/ruta-parada.model';
import { ActualizarTarifaFrecuenciaDto, CrearTarifaFrecuenciaDto, TarifaFrecuenciaDto, etiquetaParada, paradasDeFrecuencia, precioEnCentavos } from './tarifa-frecuencia.model';

export type GuardarTarifa = { frecuenciaId: number; modo: 'crear'; datos: CrearTarifaFrecuenciaDto }
  | { frecuenciaId: number; modo: 'editar'; id: number; datos: ActualizarTarifaFrecuenciaDto };
const idPositivo: ValidatorFn = control => control.value === null || (Number.isSafeInteger(control.value) && control.value > 0) ? null : { identificador: true };
const precioValido: ValidatorFn = control => control.value === '' ? null : precioEnCentavos(control.value) === null ? { precio: true } : null;

@Component({
  selector: 'app-tarifa-frecuencia-formulario', standalone: true, imports: [ReactiveFormsModule],
  templateUrl: './tarifa-frecuencia-formulario.html',
  styles: ':host { display: block; min-width: 0; } fieldset { min-width: 0; }'
})
export class TarifaFrecuenciaFormulario implements OnInit, OnChanges, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly origenInput = viewChild<ElementRef<HTMLSelectElement>>('origenInput');
  readonly frecuencia = input<FrecuenciaDto | null>(null);
  readonly tarifa = input<TarifaFrecuenciaDto | null>(null);
  readonly paradas = input<readonly RutaParadaDto[]>([]);
  readonly lugares = input<readonly LugarDto[]>([]);
  readonly cargandoParadas = input(false);
  readonly errorParadas = input<string | null>(null);
  readonly guardando = input(false);
  readonly autorizado = input(false);
  readonly error = input<string | null>(null);
  readonly guardarTarifa = output<GuardarTarifa>();
  readonly cancelar = output<void>();
  readonly reintentarParadas = output<void>();
  readonly form = this.fb.group({
    origenRutaParadaId: this.fb.control<number | null>(null, [Validators.required, idPositivo]),
    destinoRutaParadaId: this.fb.control<number | null>(null, [Validators.required, idPositivo]),
    precioBase: this.fb.nonNullable.control('', [Validators.required, precioValido])
  }, { validators: grupo => {
    const frecuencia = this.frecuencia(); const actual = this.tarifa();
    const origenId: number | null = grupo.get('origenRutaParadaId')?.value ?? null;
    const destinoId: number | null = grupo.get('destinoRutaParadaId')?.value ?? null;
    const paradas = this.paradasOrdenadas();
    const origen = paradas.find(p => p.id === origenId); const destino = paradas.find(p => p.id === destinoId);
    const precio = precioEnCentavos(grupo.get('precioBase')?.value);
    const errores: Record<string, boolean> = {};
    if (!frecuencia || !Number.isSafeInteger(frecuencia.id) || frecuencia.id <= 0 || (actual && actual.frecuenciaId !== frecuencia.id)) errores['frecuencia'] = true;
    if (origenId !== null && !origen) errores['origenAjeno'] = true;
    if (destinoId !== null && !destino) errores['destinoAjeno'] = true;
    if (origenId !== null && origenId === destinoId) errores['extremosIguales'] = true;
    if (origen && destino && origen.orden >= destino.orden) errores['orden'] = true;
    const cambia = actual && (actual.origenRutaParadaId !== origenId || actual.destinoRutaParadaId !== destinoId ||
      precio !== precioEnCentavos(String(actual.precioBase)));
    if (frecuencia && !frecuencia.activa && (!actual || (actual.activa && cambia))) errores['frecuenciaInactiva'] = true;
    return Object.keys(errores).length ? errores : null;
  } });

  ngOnInit(): void {
    const actual = this.tarifa();
    if (actual) this.form.reset({ origenRutaParadaId: actual.origenRutaParadaId, destinoRutaParadaId: actual.destinoRutaParadaId, precioBase: String(actual.precioBase) });
    this.form.controls.origenRutaParadaId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.sincronizarDestino());
  }
  ngOnChanges(): void {
    if (!this.cargandoParadas() && !this.errorParadas()) this.sincronizarDestino();
    this.form.updateValueAndValidity();
  }
  ngAfterViewInit(): void { this.origenInput()?.nativeElement.focus(); }
  paradasOrdenadas(): RutaParadaDto[] { return paradasDeFrecuencia(this.paradas(), this.frecuencia()); }
  destinosDisponibles(): RutaParadaDto[] {
    const origen = this.paradasOrdenadas().find(p => p.id === this.form.controls.origenRutaParadaId.value);
    return origen ? this.paradasOrdenadas().filter(p => p.orden > origen.orden) : [];
  }
  etiqueta(parada: RutaParadaDto): string { return etiquetaParada(parada, this.lugares()); }
  private sincronizarDestino(): void {
    const actual = this.form.controls.destinoRutaParadaId.value;
    if (actual !== null && !this.destinosDisponibles().some(p => p.id === actual)) this.form.controls.destinoRutaParadaId.setValue(null);
  }
  invalido(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo]; return control.invalid && (control.touched || control.dirty);
  }
  guardar(): void {
    if (!this.autorizado() || this.guardando() || this.cargandoParadas() || this.errorParadas()) return;
    this.form.updateValueAndValidity();
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const frecuencia = this.frecuencia(); const actual = this.tarifa(); const valor = this.form.getRawValue(); const centavos = precioEnCentavos(valor.precioBase);
    if (!frecuencia || centavos === null || valor.origenRutaParadaId === null || valor.destinoRutaParadaId === null) return;
    const datos: CrearTarifaFrecuenciaDto = { origenRutaParadaId: valor.origenRutaParadaId, destinoRutaParadaId: valor.destinoRutaParadaId, precioBase: Number(centavos) / 100 };
    this.guardarTarifa.emit(actual ? { frecuenciaId: frecuencia.id, modo: 'editar', id: actual.id, datos: { ...datos, activa: actual.activa } }
      : { frecuenciaId: frecuencia.id, modo: 'crear', datos });
  }
}
