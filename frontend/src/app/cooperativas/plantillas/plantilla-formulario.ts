import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CrearAsientoPlantillaRequest } from '../../models/plantilla-asiento.model';
import { TipoAsiento } from '../../models/tipo-asiento.model';
import { AuthService } from '../../services/auth.service';
import { PlantillaService } from '../../services/plantilla.service';
import { mensajeError } from '../../shared/http-error';

const MAX_FILAS = 50;
const MAX_COLUMNAS = 10;

const CLASES_TIPO = [
  'btn-success',
  'btn-warning',
  'btn-info',
  'btn-primary',
  'btn-danger',
  'btn-dark'
];

@Component({
  selector: 'app-plantilla-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './plantilla-formulario.html',
  styleUrl: './plantilla-formulario.css'
})
export class PlantillaFormulario implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly plantillaService = inject(PlantillaService);

  readonly plantillaId = signal<number | null>(null);
  readonly existente = computed(() => this.plantillaId() !== null);
  readonly cargando = signal(false);
  readonly errorCargar = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly errorGuardar = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly tipos = signal<TipoAsiento[]>([]);
  readonly tipoSeleccionado = signal<number | null>(null);

  readonly filas = signal(10);
  readonly columnas = signal(4);
  readonly pisos = signal(1);
  readonly celdas = signal<Record<string, number>>({});

  readonly maxFilas = MAX_FILAS;
  readonly maxColumnas = MAX_COLUMNAS;

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    pisos: [1, [Validators.required, Validators.min(1), Validators.max(2)]],
    tieneBanio: [false]
  });

  readonly listaPisos = computed(() =>
    Array.from({ length: this.pisos() }, (_, i) => i + 1)
  );
  readonly listaFilas = computed(() =>
    Array.from({ length: this.filas() }, (_, i) => i + 1)
  );
  readonly listaColumnas = computed(() =>
    Array.from({ length: this.columnas() }, (_, i) => i + 1)
  );

  readonly totalAsientos = computed(() => Object.keys(this.celdas()).length);

  // Numeración consecutiva: piso, fila y columna en orden.
  readonly numeracion = computed(() => {
    const celdas = this.celdas();
    const numeros: Record<string, string> = {};
    let n = 1;

    for (const piso of this.listaPisos()) {
      for (const fila of this.listaFilas()) {
        for (const columna of this.listaColumnas()) {
          const clave = this.clave(piso, fila, columna);
          if (celdas[clave] !== undefined) {
            numeros[clave] = String(n++);
          }
        }
      }
    }

    return numeros;
  });

  ngOnInit(): void {
    this.cargarTipos();
    this.cargarPlantillaSiExiste();
  }

  invalido(campo: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  clave(piso: number, fila: number, columna: number): string {
    return `${piso}-${fila}-${columna}`;
  }

  tipoEn(piso: number, fila: number, columna: number): number | undefined {
    return this.celdas()[this.clave(piso, fila, columna)];
  }

  numeroEn(piso: number, fila: number, columna: number): string {
    return this.numeracion()[this.clave(piso, fila, columna)] ?? '';
  }

  claseTipo(tipoId: number | undefined): string {
    if (tipoId === undefined) {
      return 'btn-outline-secondary';
    }

    const indice = this.tipos().findIndex(t => t.id === tipoId);
    return CLASES_TIPO[(indice < 0 ? 0 : indice) % CLASES_TIPO.length];
  }

  nombreTipo(tipoId: number): string {
    return this.tipos().find(t => t.id === tipoId)?.nombre ?? '';
  }

  seleccionarTipo(tipoId: number): void {
    this.tipoSeleccionado.set(tipoId);
  }

  // Coloca el asiento con el tipo elegido; si ya tiene ese tipo, lo quita (pasillo).
  alternar(piso: number, fila: number, columna: number): void {
    const tipo = this.tipoSeleccionado();

    if (tipo === null) {
      this.errorGuardar.set('Elige primero un tipo de asiento.');
      return;
    }

    this.errorGuardar.set(null);

    const clave = this.clave(piso, fila, columna);
    const actual = { ...this.celdas() };

    if (actual[clave] === tipo) {
      delete actual[clave];
    } else {
      actual[clave] = tipo;
    }

    this.celdas.set(actual);
  }

  llenarTodo(): void {
    const tipo = this.tipoSeleccionado();

    if (tipo === null) {
      this.errorGuardar.set('Elige primero un tipo de asiento.');
      return;
    }

    this.errorGuardar.set(null);

    const nuevas: Record<string, number> = {};
    for (const piso of this.listaPisos()) {
      for (const fila of this.listaFilas()) {
        for (const columna of this.listaColumnas()) {
          nuevas[this.clave(piso, fila, columna)] = tipo;
        }
      }
    }

    this.celdas.set(nuevas);
  }

  vaciar(): void {
    this.celdas.set({});
  }

  cambiarFilas(valor: string): void {
    this.filas.set(this.limitar(Number(valor), 1, MAX_FILAS));
    this.recortarCeldas();
  }

  cambiarColumnas(valor: string): void {
    this.columnas.set(this.limitar(Number(valor), 1, MAX_COLUMNAS));
    this.recortarCeldas();
  }

  cambiarPisos(valor: string): void {
    this.pisos.set(this.limitar(Number(valor), 1, 2));
    this.recortarCeldas();
  }

  guardar(): void {
    this.errorGuardar.set(null);
    this.aviso.set(null);

    const id = this.plantillaId();

    if (id === null && this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.totalAsientos() === 0) {
      this.errorGuardar.set('Coloca al menos un asiento en la cuadrícula.');
      return;
    }

    this.guardando.set(true);

    if (id !== null) {
      this.guardarDisposicion(id);
      return;
    }

    const cooperativaId = this.authService.usuarioActual()?.cooperativaId;

    if (cooperativaId == null) {
      this.guardando.set(false);
      this.errorGuardar.set('Tu usuario no está asociado a una cooperativa.');
      return;
    }

    const v = this.form.getRawValue();

    this.plantillaService.crear({
      cooperativaId,
      nombre: (v.nombre ?? '').trim(),
      pisos: this.pisos(),
      tieneBanio: v.tieneBanio ?? false
    }).subscribe({
      next: plantilla => {
        // Si falla el guardado de asientos, un reintento no duplica la plantilla.
        this.plantillaId.set(plantilla.id);
        this.guardarDisposicion(plantilla.id);
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        this.errorGuardar.set(
          mensajeError(e, 'No se pudo crear la plantilla. Inténtalo de nuevo.')
        );
      }
    });
  }

  private guardarDisposicion(plantillaId: number): void {
    this.plantillaService
      .definirDisposicion(plantillaId, this.construirAsientos())
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.router.navigate(['/cooperativas/plantillas']);
        },
        error: (e: unknown) => {
          this.guardando.set(false);
          this.errorGuardar.set(
            mensajeError(
              e,
              'La plantilla se creó, pero no se pudieron guardar los asientos. Inténtalo de nuevo.'
            )
          );
        }
      });
  }

  private construirAsientos(): CrearAsientoPlantillaRequest[] {
    const celdas = this.celdas();
    const numeros = this.numeracion();
    const asientos: CrearAsientoPlantillaRequest[] = [];

    for (const piso of this.listaPisos()) {
      for (const fila of this.listaFilas()) {
        for (const columna of this.listaColumnas()) {
          const clave = this.clave(piso, fila, columna);
          if (celdas[clave] !== undefined) {
            asientos.push({
              tipoAsientoId: celdas[clave],
              numero: numeros[clave],
              piso,
              fila,
              columna
            });
          }
        }
      }
    }

    return asientos;
  }

  private recortarCeldas(): void {
    const filas = this.filas();
    const columnas = this.columnas();
    const pisos = this.pisos();
    const recortadas: Record<string, number> = {};

    for (const [clave, tipo] of Object.entries(this.celdas())) {
      const [piso, fila, columna] = clave.split('-').map(Number);
      if (piso <= pisos && fila <= filas && columna <= columnas) {
        recortadas[clave] = tipo;
      }
    }

    this.celdas.set(recortadas);
  }

  private limitar(valor: number, minimo: number, maximo: number): number {
    if (!Number.isFinite(valor)) {
      return minimo;
    }

    return Math.min(Math.max(Math.trunc(valor), minimo), maximo);
  }

  private cargarTipos(): void {
    const cooperativaId = this.authService.usuarioActual()?.cooperativaId;

    this.plantillaService.listarTiposAsiento(cooperativaId ?? undefined).subscribe({
      next: tipos => {
        const activos = tipos.filter(t => t.activo);
        this.tipos.set(activos);

        if (this.tipoSeleccionado() === null && activos.length > 0) {
          this.tipoSeleccionado.set(activos[0].id);
        }
      },
      error: () =>
        this.errorCargar.set('No se pudieron cargar los tipos de asiento.')
    });
  }

  private cargarPlantillaSiExiste(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      return;
    }

    this.plantillaId.set(id);
    this.cargando.set(true);

    this.plantillaService.obtener(id).subscribe({
      next: plantilla => {
        this.form.patchValue({
          nombre: plantilla.nombre,
          pisos: plantilla.pisos,
          tieneBanio: plantilla.tieneBanio
        });
        this.form.disable();
        this.pisos.set(plantilla.pisos);

        this.plantillaService.obtenerDisposicion(id).subscribe({
          next: asientos => {
            const celdas: Record<string, number> = {};
            let filas = 1;
            let columnas = 1;

            for (const a of asientos) {
              if (a.fila == null || a.columna == null) {
                continue;
              }
              celdas[this.clave(a.piso, a.fila, a.columna)] = a.tipoAsientoId;
              filas = Math.max(filas, a.fila);
              columnas = Math.max(columnas, a.columna);
            }

            this.filas.set(filas);
            this.columnas.set(columnas);
            this.celdas.set(celdas);
            this.cargando.set(false);
          },
          error: (e: { status?: number }) => this.falloCarga(e.status)
        });
      },
      error: (e: { status?: number }) => this.falloCarga(e.status)
    });
  }

  private falloCarga(status?: number): void {
    this.cargando.set(false);
    this.errorCargar.set(
      status === 404
        ? 'La plantilla no existe.'
        : status === 403
          ? 'No puedes editar una plantilla de otra cooperativa.'
          : 'No se pudo cargar la plantilla. Inténtalo de nuevo.'
    );
  }
}
