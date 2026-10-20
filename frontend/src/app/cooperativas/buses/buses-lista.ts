import { Component, inject, OnInit, signal } from '@angular/core';

import { Bus, EstadoBus } from '../../models/bus.model';
import { AuthService } from '../../services/auth.service';
import { BusService } from '../../services/bus.service';

@Component({
  selector: 'app-buses-lista',
  standalone: true,
  templateUrl: './buses-lista.html',
  styleUrl: './buses-lista.css'
})
export class BusesLista implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly busService = inject(BusService);

  readonly buses = signal<Bus[]>([]);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  claseEstado(estado: EstadoBus): string {
    switch (estado) {
      case 'ACTIVO':
        return 'text-bg-success';
      case 'MANTENIMIENTO':
        return 'text-bg-warning';
      default:
        return 'text-bg-secondary';
    }
  }

  cargar(): void {
    const cooperativaId = this.authService.usuarioActual()?.cooperativaId;

    if (cooperativaId == null) {
      this.error.set('Tu usuario no está asociado a una cooperativa.');
      return;
    }

    this.error.set(null);

    this.busService.listar(cooperativaId).subscribe({
      next: buses => this.buses.set(buses),
      error: () => this.error.set(
        'No se pudieron cargar los buses. Verifica tu conexión e inténtalo de nuevo.'
      )
    });
  }
}
