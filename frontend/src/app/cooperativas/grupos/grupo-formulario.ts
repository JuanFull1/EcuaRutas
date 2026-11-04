import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { mensajeError } from '../../shared/http-error';
import {
  ActualizarGrupoBusRequest,
  CrearGrupoBusRequest
} from '../../models/grupo-bus.model';
import { AuthService } from '../../services/auth.service';
import { GrupoBusService } from '../../services/grupo-bus.service';

@Component({
  selector: 'app-grupo-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './grupo-formulario.html',
  styleUrl: './grupo-formulario.css'
})
export class GrupoFormulario implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly grupoBusService = inject(GrupoBusService);

  readonly grupoId = signal<number | null>(null);
  readonly esEdicion = computed(() => this.grupoId() !== null);
  readonly cargandoGrupo = signal(false);
  readonly errorCargar = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly errorGuardar = signal<string | null>(null);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: ['', [Validators.maxLength(500)]],
    activo: [true]
  });

  ngOnInit(): void {
    this.cargarGrupoSiEdita();
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

    const cooperativaId = this.authService.usuarioActual()?.cooperativaId;

    if (cooperativaId == null) {
      this.errorGuardar.set('Tu usuario no está asociado a una cooperativa.');
      return;
    }

    const v = this.form.getRawValue();
    const nombre = (v.nombre ?? '').trim();
    const descripcion = this.texto(v.descripcion);

    this.errorGuardar.set(null);
    this.guardando.set(true);

    const id = this.grupoId();
    const peticion$ = id === null
      ? this.grupoBusService.crear(this.aCrear(cooperativaId, nombre, descripcion))
      : this.grupoBusService.actualizar(
          id,
          this.aActualizar(nombre, descripcion, v.activo ?? true)
        );

    peticion$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.router.navigate(['/cooperativas/grupos']);
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        this.errorGuardar.set(
          mensajeError(e, 'No se pudo guardar el grupo. Inténtalo de nuevo.')
        );
      }
    });
  }

  private aCrear(
    cooperativaId: number,
    nombre: string,
    descripcion: string | undefined
  ): CrearGrupoBusRequest {
    return { cooperativaId, nombre, descripcion };
  }

  private aActualizar(
    nombre: string,
    descripcion: string | undefined,
    activo: boolean
  ): ActualizarGrupoBusRequest {
    return { nombre, descripcion, activo };
  }

  private cargarGrupoSiEdita(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      return;
    }

    this.grupoId.set(id);
    this.cargandoGrupo.set(true);

    this.grupoBusService.obtener(id).subscribe({
      next: grupo => {
        this.form.patchValue({
          nombre: grupo.nombre,
          descripcion: grupo.descripcion ?? '',
          activo: grupo.activo
        });
        this.cargandoGrupo.set(false);
      },
      error: (e: { status?: number }) => {
        this.cargandoGrupo.set(false);
        this.errorCargar.set(
          e.status === 404
            ? 'El grupo no existe.'
            : e.status === 403
              ? 'No puedes editar un grupo de otra cooperativa.'
              : 'No se pudo cargar el grupo. Inténtalo de nuevo.'
        );
      }
    });
  }

  private texto(valor: string | null | undefined): string | undefined {
    const limpio = valor?.trim();
    return limpio ? limpio : undefined;
  }
}
