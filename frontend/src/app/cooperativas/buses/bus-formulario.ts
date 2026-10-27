import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CrearBusRequest } from '../../models/bus.model';
import { GrupoBus } from '../../models/grupo-bus.model';
import { AuthService } from '../../services/auth.service';
import { BusService } from '../../services/bus.service';
import { GrupoBusService } from '../../services/grupo-bus.service';

@Component({
  selector: 'app-bus-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './bus-formulario.html',
  styleUrl: './bus-formulario.css'
})
export class BusFormulario implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly busService = inject(BusService);
  private readonly grupoBusService = inject(GrupoBusService);

  readonly grupos = signal<GrupoBus[]>([]);
  readonly errorGrupos = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly errorGuardar = signal<string | null>(null);

  readonly form = this.fb.group({
    numeroInterno: ['', [Validators.required, Validators.maxLength(30)]],
    placa: ['', [Validators.required, Validators.maxLength(20)]],
    grupoBusId: [null as number | null],
    color: ['', [Validators.maxLength(50)]],
    marcaChasis: ['', [Validators.maxLength(100)]],
    marcaCarroceria: ['', [Validators.maxLength(100)]],
    modelo: ['', [Validators.maxLength(100)]],
    anio: [null as number | null, [Validators.min(1900), Validators.max(2100)]],
    pisos: [1, [Validators.required, Validators.min(1), Validators.max(2)]],
    capacidad: [null as number | null, [Validators.required, Validators.min(1), Validators.max(32767)]],
    tieneBanio: [false],
    fotoUrl: ['', [Validators.maxLength(500)]]
  });

  ngOnInit(): void {
    this.cargarGrupos();
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

    const request: CrearBusRequest = {
      cooperativaId,
      grupoBusId: v.grupoBusId,
      numeroInterno: (v.numeroInterno ?? '').trim(),
      placa: (v.placa ?? '').trim(),
      color: this.texto(v.color),
      marcaChasis: this.texto(v.marcaChasis),
      marcaCarroceria: this.texto(v.marcaCarroceria),
      modelo: this.texto(v.modelo),
      anio: v.anio ?? undefined,
      pisos: v.pisos ?? 1,
      capacidad: v.capacidad ?? 0,
      tieneBanio: v.tieneBanio ?? false,
      fotoUrl: this.texto(v.fotoUrl)
    };

    this.errorGuardar.set(null);
    this.guardando.set(true);

    this.busService.crear(request).subscribe({
      next: () => {
        this.guardando.set(false);
        this.router.navigate(['/cooperativas/buses']);
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorGuardar.set(this.mensajeError(e));
      }
    });
  }

  private texto(valor: string | null | undefined): string | undefined {
    const limpio = valor?.trim();
    return limpio ? limpio : undefined;
  }

  private mensajeError(e: HttpErrorResponse): string {
    switch (e.status) {
      case 0:
        return 'No se pudo conectar con el servidor. Verifica tu conexión.';
      case 400:
        return 'Revisa los datos ingresados, alguno no es válido.';
      case 404:
        return 'La cooperativa o el grupo seleccionado ya no existe.';
      case 409:
        return 'Ya existe un bus con ese número interno o esa placa.';
      default:
        return 'No se pudo guardar el bus. Inténtalo de nuevo.';
    }
  }

  private cargarGrupos(): void {
    const cooperativaId = this.authService.usuarioActual()?.cooperativaId;

    if (cooperativaId == null) {
      this.errorGrupos.set('Tu usuario no está asociado a una cooperativa.');
      return;
    }

    this.grupoBusService.listar(cooperativaId).subscribe({
      next: grupos => this.grupos.set(grupos.filter(g => g.activo)),
      error: () =>
        this.errorGrupos.set('No se pudieron cargar los grupos de buses.')
    });
  }
}
