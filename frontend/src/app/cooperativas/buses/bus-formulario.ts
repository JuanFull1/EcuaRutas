import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { GrupoBus } from '../../models/grupo-bus.model';
import { AuthService } from '../../services/auth.service';
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
  private readonly authService = inject(AuthService);
  private readonly grupoBusService = inject(GrupoBusService);

  readonly grupos = signal<GrupoBus[]>([]);
  readonly errorGrupos = signal<string | null>(null);

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
