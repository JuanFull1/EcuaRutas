import { Component, inject, OnInit, signal } from '@angular/core';

import { PlantillaBus } from '../../models/plantilla-bus.model';
import { AuthService } from '../../services/auth.service';
import { PlantillaService } from '../../services/plantilla.service';

@Component({
  selector: 'app-plantillas-lista',
  standalone: true,
  templateUrl: './plantillas-lista.html',
  styleUrl: './plantillas-lista.css'
})
export class PlantillasLista implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly plantillaService = inject(PlantillaService);

  readonly plantillas = signal<PlantillaBus[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    const cooperativaId = this.authService.usuarioActual()?.cooperativaId;

    if (cooperativaId == null) {
      this.error.set('Tu usuario no está asociado a una cooperativa.');
      return;
    }

    this.error.set(null);
    this.cargando.set(true);

    this.plantillaService.listar(cooperativaId).subscribe({
      next: plantillas => {
        this.plantillas.set(plantillas);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(
          'No se pudieron cargar las plantillas. Verifica tu conexión e inténtalo de nuevo.'
        );
        this.cargando.set(false);
      }
    });
  }
}
