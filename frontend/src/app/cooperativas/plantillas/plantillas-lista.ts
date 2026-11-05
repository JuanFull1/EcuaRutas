import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { PlantillaAsiento } from '../../models/plantilla-asiento.model';
import { PlantillaBus } from '../../models/plantilla-bus.model';
import { TipoAsiento } from '../../models/tipo-asiento.model';
import { AuthService } from '../../services/auth.service';
import { PlantillaService } from '../../services/plantilla.service';
import { mensajeError } from '../../shared/http-error';
import {
  AsientoMapa,
  MapaAsientos
} from '../../shared/mapa-asientos/mapa-asientos';

interface VistaPlantilla {
  asientos: AsientoMapa[];
  filas: number;
  columnas: number;
}

@Component({
  selector: 'app-plantillas-lista',
  standalone: true,
  imports: [RouterLink, MapaAsientos],
  templateUrl: './plantillas-lista.html',
  styleUrls: ['../../shared/formulario/formulario.css', './plantillas-lista.css']
})
export class PlantillasLista implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly plantillaService = inject(PlantillaService);

  readonly plantillas = signal<PlantillaBus[]>([]);
  readonly vistas = signal<Record<number, VistaPlantilla>>({});
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorAccion = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  vistaDe(id: number): VistaPlantilla | undefined {
    return this.vistas()[id];
  }

  eliminar(plantilla: PlantillaBus): void {
    const aviso =
      `¿Eliminar la plantilla "${plantilla.nombre}"? ` +
      'Los buses que ya la usan conservan sus asientos.';

    if (!confirm(aviso)) {
      return;
    }

    this.errorAccion.set(null);

    this.plantillaService.desactivar(plantilla.id).subscribe({
      next: () => this.cargar(),
      error: (e: unknown) =>
        this.errorAccion.set(
          mensajeError(e, 'No se pudo eliminar la plantilla. Inténtalo de nuevo.')
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

    this.plantillaService.listar(cooperativaId).subscribe({
      next: plantillas => {
        this.plantillas.set(plantillas);
        this.cargando.set(false);
        this.cargarMiniaturas(plantillas, cooperativaId);
      },
      error: () => {
        this.error.set(
          'No se pudieron cargar las plantillas. Verifica tu conexión e inténtalo de nuevo.'
        );
        this.cargando.set(false);
      }
    });
  }

  // Las miniaturas son un extra: si fallan, la tarjeta se muestra sin dibujo.
  private cargarMiniaturas(plantillas: PlantillaBus[], cooperativaId: number): void {
    if (plantillas.length === 0) {
      return;
    }

    forkJoin({
      tipos: this.plantillaService
        .listarTiposAsiento(cooperativaId)
        .pipe(catchError(() => of([] as TipoAsiento[]))),
      disposiciones: forkJoin(
        plantillas.map(p =>
          this.plantillaService
            .obtenerDisposicion(p.id)
            .pipe(catchError(() => of([] as PlantillaAsiento[])))
        )
      )
    }).subscribe(({ tipos, disposiciones }) => {
      const activos = tipos.filter(t => t.activo);
      const vistas: Record<number, VistaPlantilla> = {};

      plantillas.forEach((plantilla, i) => {
        vistas[plantilla.id] = this.aVista(disposiciones[i], activos);
      });

      this.vistas.set(vistas);
    });
  }

  private aVista(asientos: PlantillaAsiento[], tipos: TipoAsiento[]): VistaPlantilla {
    const ordenados = asientos
      .filter(a => a.fila != null && a.columna != null)
      .sort((a, b) => a.piso - b.piso || a.fila! - b.fila! || a.columna! - b.columna!);

    let filas = 1;
    let columnas = 1;

    const mapa: AsientoMapa[] = ordenados.map(a => {
      filas = Math.max(filas, a.fila!);
      columnas = Math.max(columnas, a.columna!);
      const indice = tipos.findIndex(t => t.id === a.tipoAsientoId);

      return {
        piso: a.piso,
        fila: a.fila!,
        columna: a.columna!,
        numero: a.numero,
        tipoId: a.tipoAsientoId,
        tipoNombre: tipos[indice]?.nombre ?? '',
        colorIndex: indice < 0 ? 0 : indice % 6
      };
    });

    return { asientos: mapa, filas, columnas };
  }
}
