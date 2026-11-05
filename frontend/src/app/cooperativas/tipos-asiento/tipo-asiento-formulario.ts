import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, Observable } from 'rxjs';

import { TipoAsiento } from '../../models/tipo-asiento.model';
import { AuthService } from '../../services/auth.service';
import { PlantillaService } from '../../services/plantilla.service';
import { mensajeError } from '../../shared/http-error';

@Component({
  selector: 'app-tipo-asiento-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './tipo-asiento-formulario.html',
  styleUrls: ['../../shared/formulario/formulario.css']
})
export class TipoAsientoFormulario implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly plantillaService = inject(PlantillaService);

  /** Precio de ejemplo para mostrar cómo queda el recargo. */
  readonly precioEjemplo = 10;

  readonly tipoId = signal<number | null>(null);
  readonly esEdicion = computed(() => this.tipoId() !== null);
  readonly cargandoTipo = signal(false);
  readonly errorCargar = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly errorGuardar = signal<string | null>(null);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    recargoPorcentaje: [0, [Validators.required, Validators.min(0), Validators.max(100)]]
  });

  private readonly recargoEscrito = toSignal(
    this.form.controls.recargoPorcentaje.valueChanges, { initialValue: 0 }
  );

  readonly precioConRecargo = computed(() => {
    const recargo = Number(this.recargoEscrito());
    const valido = Number.isFinite(recargo) && recargo >= 0 && recargo <= 100 ? recargo : 0;
    return this.precioEjemplo * (1 + valido / 100);
  });

  ngOnInit(): void {
    this.cargarSiEdita();
  }

  invalido(campo: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const nombre = (v.nombre ?? '').trim();
    const recargoPorcentaje = Number(v.recargoPorcentaje ?? 0);

    if (!nombre) {
      this.form.controls.nombre.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    const id = this.tipoId();
    let peticion$: Observable<TipoAsiento>;

    if (id === null) {
      const cooperativaId = this.authService.usuarioActual()?.cooperativaId;

      if (cooperativaId == null) {
        this.errorGuardar.set('Tu usuario no está asociado a una cooperativa.');
        return;
      }

      peticion$ = this.plantillaService.crearTipoAsiento({ cooperativaId, nombre, recargoPorcentaje });
    } else {
      peticion$ = this.plantillaService.actualizarTipoAsiento(id, { nombre, recargoPorcentaje });
    }

    this.errorGuardar.set(null);
    this.guardando.set(true);

    peticion$.pipe(map(() => undefined)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.router.navigate(['/cooperativas/tipos-asiento']);
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        this.errorGuardar.set(mensajeError(e, 'No se pudo guardar el tipo de asiento. Inténtalo de nuevo.'));
      }
    });
  }

  private cargarSiEdita(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      return;
    }

    this.tipoId.set(id);
    this.cargandoTipo.set(true);

    this.plantillaService.obtenerTipoAsiento(id).subscribe({
      next: tipo => {
        this.form.patchValue({
          nombre: tipo.nombre,
          recargoPorcentaje: tipo.recargoPorcentaje
        });
        this.cargandoTipo.set(false);
      },
      error: (e: unknown) => {
        this.cargandoTipo.set(false);
        this.errorCargar.set(mensajeError(e, 'No se pudo cargar el tipo de asiento.'));
      }
    });
  }
}
