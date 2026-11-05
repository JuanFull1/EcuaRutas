import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TipoAsiento } from '../../models/tipo-asiento.model';
import { AuthService } from '../../services/auth.service';
import { PlantillaService } from '../../services/plantilla.service';
import { mensajeError } from '../../shared/http-error';

@Component({
  selector: 'app-tipos-asiento-lista',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './tipos-asiento-lista.html',
  styleUrls: ['../../shared/formulario/formulario.css']
})
export class TiposAsientoLista implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly plantillaService = inject(PlantillaService);

  readonly tipos = signal<TipoAsiento[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorAccion = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  desactivar(tipo: TipoAsiento): void {
    if (!confirm(`¿Desactivar el tipo de asiento ${tipo.nombre}? Los asientos que ya lo usan se conservan.`)) {
      return;
    }

    this.errorAccion.set(null);

    this.plantillaService.desactivarTipoAsiento(tipo.id).subscribe({
      next: () => this.cargar(),
      error: (e: unknown) =>
        this.errorAccion.set(
          mensajeError(e, 'No se pudo desactivar el tipo de asiento. Inténtalo de nuevo.')
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

    this.plantillaService.listarTiposAsiento(cooperativaId).subscribe({
      next: tipos => {
        this.tipos.set(tipos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(
          'No se pudieron cargar los tipos de asiento. Verifica tu conexión e inténtalo de nuevo.'
        );
        this.cargando.set(false);
      }
    });
  }
}
