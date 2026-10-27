import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Bus, EstadoBus } from '../../models/bus.model';
import { AuthService } from '../../services/auth.service';
import { BusService } from '../../services/bus.service';

@Component({
  selector: 'app-buses-lista',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './buses-lista.html',
  styleUrl: './buses-lista.css'
})
export class BusesLista implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly busService = inject(BusService);

  readonly estados: EstadoBus[] = ['ACTIVO', 'MANTENIMIENTO', 'INACTIVO'];

  readonly buses = signal<Bus[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly filtroEstado = signal<EstadoBus | ''>('');

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

  cambiarFiltro(valor: string): void {
    this.filtroEstado.set(valor as EstadoBus | '');
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

    this.busService
      .listar(cooperativaId, undefined, this.filtroEstado() || undefined)
      .subscribe({
        next: buses => {
          this.buses.set(buses);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set(
            'No se pudieron cargar los buses. Verifica tu conexión e inténtalo de nuevo.'
          );
          this.cargando.set(false);
        }
      });
  }
}
