import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AsientoBus } from '../../models/asiento-bus.model';
import { Bus } from '../../models/bus.model';
import { TipoAsiento } from '../../models/tipo-asiento.model';
import { AuthService } from '../../services/auth.service';
import { BusService } from '../../services/bus.service';
import { PlantillaService } from '../../services/plantilla.service';
import { AsientoMapa, MapaAsientos } from '../../shared/mapa-asientos/mapa-asientos';

@Component({
  selector: 'app-bus-asientos',
  standalone: true,
  imports: [RouterLink, MapaAsientos],
  templateUrl: './bus-asientos.html',
  styleUrl: './bus-asientos.css'
})
export class BusAsientos implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly busService = inject(BusService);
  private readonly plantillaService = inject(PlantillaService);

  readonly bus = signal<Bus | null>(null);
  readonly asientos = signal<AsientoBus[]>([]);
  readonly tipos = signal<TipoAsiento[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  /** Solo se dibujan los asientos que tienen fila y columna. */
  private readonly dibujables = computed(() =>
    this.asientos().filter(a => a.fila !== null && a.columna !== null)
  );

  readonly sinPosicion = computed(() => this.asientos().length - this.dibujables().length);

  readonly filas = computed(() =>
    Math.max(1, ...this.dibujables().map(a => a.fila ?? 0))
  );

  readonly columnas = computed(() =>
    Math.max(1, ...this.dibujables().map(a => a.columna ?? 0))
  );

  readonly asientosMapa = computed<AsientoMapa[]>(() =>
    this.dibujables().map(a => ({
      piso: a.piso,
      fila: a.fila as number,
      columna: a.columna as number,
      numero: a.numero,
      tipoId: a.tipoAsientoId,
      tipoNombre: a.tipoAsiento,
      colorIndex: this.indiceTipo(a.tipoAsientoId)
    }))
  );

  readonly resumen = computed(() => {
    const cuenta = new Map<number, { nombre: string; cantidad: number; color: number }>();

    for (const a of this.asientos()) {
      const actual = cuenta.get(a.tipoAsientoId);
      if (actual) {
        actual.cantidad++;
      } else {
        cuenta.set(a.tipoAsientoId, {
          nombre: a.tipoAsiento,
          cantidad: 1,
          color: this.indiceTipo(a.tipoAsientoId)
        });
      }
    }

    return [...cuenta.values()];
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.error.set('El bus no existe.');
      this.cargando.set(false);
      return;
    }

    forkJoin({
      bus: this.busService.obtener(id),
      asientos: this.plantillaService.listarAsientosDeBus(id),
      tipos: this.plantillaService.listarTiposAsiento(
        this.authService.usuarioActual()?.cooperativaId ?? undefined
      )
    }).subscribe({
      next: ({ bus, asientos, tipos }) => {
        this.bus.set(bus);
        this.asientos.set(asientos);
        this.tipos.set(tipos.filter(t => t.activo));
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(this.mensajeError(e));
        this.cargando.set(false);
      }
    });
  }

  private indiceTipo(tipoId: number): number {
    const indice = this.tipos().findIndex(t => t.id === tipoId);
    return indice < 0 ? 0 : indice % 6;
  }

  private mensajeError(e: HttpErrorResponse): string {
    switch (e.status) {
      case 0:
        return 'No se pudo conectar con el servidor. Verifica tu conexión.';
      case 403:
        return 'No puedes ver un bus de otra cooperativa.';
      case 404:
        return 'El bus no existe.';
      default:
        return 'No se pudieron cargar los asientos. Inténtalo de nuevo.';
    }
  }
}
