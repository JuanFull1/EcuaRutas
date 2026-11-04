import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { mensajeError } from '../../shared/http-error';
import { GrupoBus } from '../../models/grupo-bus.model';
import { AuthService } from '../../services/auth.service';
import { GrupoBusService } from '../../services/grupo-bus.service';

@Component({
  selector: 'app-grupos-lista',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './grupos-lista.html',
  styleUrl: './grupos-lista.css'
})
export class GruposLista implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly grupoBusService = inject(GrupoBusService);

  readonly grupos = signal<GrupoBus[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorAccion = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  desactivar(grupo: GrupoBus): void {
    if (!confirm(`¿Desactivar el grupo ${grupo.nombre}?`)) {
      return;
    }

    this.errorAccion.set(null);

    this.grupoBusService.desactivar(grupo.id).subscribe({
      next: () => this.cargar(),
      error: (e: unknown) =>
        this.errorAccion.set(
          mensajeError(e, 'No se pudo desactivar el grupo. Inténtalo de nuevo.')
        )
    });
  }

  cargar(): void {
    const cooperativaId = this.authService.usuarioActual()?.cooperativaId;

    if (cooperativaId == null) {
      this.error.set('Tu usuario no está asociado a una cooperativa.');
      return;
    }

    this.error.set(null);
    this.cargando.set(true);

    this.grupoBusService.listar(cooperativaId).subscribe({
      next: grupos => {
        this.grupos.set(grupos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(
          'No se pudieron cargar los grupos de buses. Verifica tu conexión e inténtalo de nuevo.'
        );
        this.cargando.set(false);
      }
    });
  }
}
