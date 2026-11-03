import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { mensajeError } from '../../../shared/http-error';
import { TipoAsignacion } from '../../models/hoja-ruta.model';
import { HojasRutaApiService } from '../../services/hojas-ruta-api.service';

@Component({
  selector: 'app-hoja-ruta-formulario', standalone: true, imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './hoja-ruta-formulario.html'
})
export class HojaRutaFormulario {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HojasRutaApiService);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly guardando = signal(false);

  readonly form = this.fb.group({
    grupoBusId: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    fecha: this.fb.nonNullable.control('', Validators.required),
    detalles: this.fb.array([this.nuevoDetalle(1)])
  });

  get detalles() { return this.form.controls.detalles; }
  agregarDetalle(): void { this.detalles.push(this.nuevoDetalle(this.detalles.length + 1)); }
  quitarDetalle(i: number): void { if (this.detalles.length > 1) this.detalles.removeAt(i); }

  guardar(): void {
    this.error.set('');
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.api.crearManual({
      grupoBusId: v.grupoBusId!, fecha: v.fecha,
      detalles: v.detalles.map(d => ({
        busId: d.busId!, tipoAsignacion: d.tipoAsignacion,
        frecuenciaId: d.tipoAsignacion === 'SERVICIO' ? d.frecuenciaId : null,
        ordenDia: d.ordenDia, horaProgramada: d.horaProgramada || null, observacion: d.observacion || null
      }))
    }).subscribe({
      next: hoja => this.router.navigate(['/viajes/hojas-ruta', hoja.id]),
      error: e => { this.error.set(mensajeError(e)); this.guardando.set(false); }
    });
  }

  private nuevoDetalle(orden: number) {
    return this.fb.group({
      busId: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
      tipoAsignacion: this.fb.nonNullable.control<TipoAsignacion>('SERVICIO'),
      frecuenciaId: this.fb.control<number | null>(null),
      ordenDia: this.fb.nonNullable.control(orden, Validators.min(1)),
      horaProgramada: this.fb.nonNullable.control(''),
      observacion: this.fb.nonNullable.control('')
    });
  }
}