import { Component, inject, OnInit, signal } from '@angular/core';

import { AuthService } from '../../services/auth.service';
import { BusService } from '../../services/bus.service';
import { PlantillaService } from '../../services/plantilla.service';

@Component({
  selector: 'app-inicio-cooperativa',
  standalone: true,
  templateUrl: './inicio-cooperativa.html',
  styleUrl: './inicio-cooperativa.css'
})
export class InicioCooperativa implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly busService = inject(BusService);
  private readonly plantillaService = inject(PlantillaService);

  readonly totalBuses = signal<number | null>(null);
  readonly totalPlantillas = signal<number | null>(null);

  ngOnInit(): void {
    const cooperativaId = this.authService.usuarioActual()?.cooperativaId;

    if (cooperativaId == null) {
      return;
    }

    this.busService.listar(cooperativaId).subscribe({
      next: buses => this.totalBuses.set(
        buses.filter(bus => bus.estado !== 'INACTIVO').length
      ),
      error: () => this.totalBuses.set(null)
    });

    this.plantillaService.listar(cooperativaId).subscribe({
      next: plantillas => this.totalPlantillas.set(
        plantillas.filter(plantilla => plantilla.activa).length
      ),
      error: () => this.totalPlantillas.set(null)
    });
  }
}
