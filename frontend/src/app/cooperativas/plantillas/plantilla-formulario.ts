import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CrearAsientoPlantillaRequest } from '../../models/plantilla-asiento.model';
import { TipoAsiento } from '../../models/tipo-asiento.model';
import { AuthService } from '../../services/auth.service';
import { PlantillaService } from '../../services/plantilla.service';
import { mensajeError } from '../../shared/http-error';
import {
  AsientoMapa,
  MapaAsientos,
  MoverAsientoEvento,
  PosicionAsiento,
  SoltarTipoEvento
} from '../../shared/mapa-asientos/mapa-asientos';

const MAX_FILAS = 50;
const MAX_COLUMNAS = 10;
const MAX_ASIENTOS = 80;

@Component({
  selector: 'app-plantilla-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MapaAsientos],
  templateUrl: './plantilla-formulario.html',
  styleUrls: ['../../shared/formulario/formulario.css', './plantilla-formulario.css']
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

  readonly tipos = signal<TipoAsiento[]>([]);
  readonly tipoSeleccionado = signal<number | null>(null);
  readonly seleccion = signal<PosicionAsiento | null>(null);

  readonly filas = signal(10);
  readonly columnas = signal(5);
  readonly pisos = signal(1);
  readonly cantidad = signal(40);
  readonly precioEjemplo = signal(10);
  readonly celdas = signal<Record<string, number>>({});

  readonly maxFilas = MAX_FILAS;
  readonly maxColumnas = MAX_COLUMNAS;
  readonly maxAsientos = MAX_ASIENTOS;

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    tieneBanio: [false]
  });

  readonly tieneBanio = signal(false);

  readonly totalAsientos = computed(() => Object.keys(this.celdas()).length);

  // Numeración consecutiva: piso, fila y columna en orden.
  readonly numeracion = computed(() => {
    const celdas = this.celdas();
    const numeros: Record<string, string> = {};
    let n = 1;

    for (let piso = 1; piso <= this.pisos(); piso++) {
      for (let fila = 1; fila <= this.filas(); fila++) {
        for (let columna = 1; columna <= this.columnas(); columna++) {
          const clave = this.clave(piso, fila, columna);
          if (celdas[clave] !== undefined) {
            numeros[clave] = String(n++);
          }
        }
      }
    }

    return numeros;
  });

  readonly asientosMapa = computed<AsientoMapa[]>(() => {
    const numeros = this.numeracion();
    const resultado: AsientoMapa[] = [];

    for (const [clave, tipoId] of Object.entries(this.celdas())) {
      const [piso, fila, columna] = clave.split('-').map(Number);
      resultado.push({
        piso,
        fila,
        columna,
        numero: numeros[clave] ?? '',
        tipoId,
        tipoNombre: this.nombreTipo(tipoId),
        colorIndex: this.indiceTipo(tipoId),
        precio: this.precioDe(tipoId)
      });
    }

    return resultado;
  });

  readonly asientoSeleccionado = computed(() => {
    const s = this.seleccion();
    return s
      ? this.asientosMapa().find(
          a => a.piso === s.piso && a.fila === s.fila && a.columna === s.columna
        ) ?? null
      : null;
  });

  readonly resumenPorTipo = computed(() => {
    const cuenta = new Map<number, number>();
    for (const tipoId of Object.values(this.celdas())) {
      cuenta.set(tipoId, (cuenta.get(tipoId) ?? 0) + 1);
    }

    return this.tipos()
      .filter(t => cuenta.has(t.id))
      .map(t => ({ tipo: t, total: cuenta.get(t.id) ?? 0 }));
  });

  ngOnInit(): void {
    this.cargarTipos();
    this.cargarPlantillaSiExiste();

    this.form.controls.tieneBanio.valueChanges.subscribe(v =>
      this.tieneBanio.set(v ?? false)
    );
  }

  @HostListener('document:keydown.delete', ['$event'])
  alPulsarSuprimir(ev: Event): void {
    const destino = ev.target as HTMLElement | null;
    const etiqueta = destino?.tagName;

    // No quita el asiento mientras se escribe en un campo.
    if (etiqueta === 'INPUT' || etiqueta === 'SELECT' || etiqueta === 'TEXTAREA') {
      return;
    }

    this.eliminarSeleccionado();
  }

  invalido(campo: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  indiceTipo(tipoId: number): number {
    const indice = this.tipos().findIndex(t => t.id === tipoId);
    return indice < 0 ? 0 : indice % 6;
  }

  nombreTipo(tipoId: number): string {
    return this.tipos().find(t => t.id === tipoId)?.nombre ?? '';
  }

  precioDe(tipoId: number): number {
    const recargo = this.tipos().find(t => t.id === tipoId)?.recargoPorcentaje ?? 0;
    const base = Number(this.precioEjemplo()) || 0;
    return Math.round(base * (1 + recargo / 100) * 100) / 100;
  }

  seleccionarTipo(tipoId: number): void {
    this.tipoSeleccionado.set(tipoId);

    // Con un asiento elegido, el tipo se aplica a ese asiento.
    const s = this.seleccion();
    if (s && this.celdas()[this.clave(s.piso, s.fila, s.columna)] !== undefined) {
      this.colocar(s, tipoId);
    }
  }

  arrastrarTipo(ev: DragEvent, tipoId: number): void {
    ev.dataTransfer?.setData('application/x-tipo', String(tipoId));
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = 'copy';
    }
  }

  alHacerClic(pos: PosicionAsiento): void {
    this.errorGuardar.set(null);
    const clave = this.clave(pos.piso, pos.fila, pos.columna);

    if (this.celdas()[clave] !== undefined) {
      this.seleccion.set(this.esMisma(this.seleccion(), pos) ? null : pos);
      return;
    }

    const tipo = this.tipoSeleccionado();
    if (tipo === null) {
      this.errorGuardar.set('Elige primero un tipo de asiento.');
      return;
    }

    this.colocar(pos, tipo);
    this.seleccion.set(pos);
  }

  alSoltarTipo(evento: SoltarTipoEvento): void {
    this.errorGuardar.set(null);
    this.tipoSeleccionado.set(evento.tipoId);
    this.colocar(evento.destino, evento.tipoId);
    this.seleccion.set(evento.destino);
  }

  alMover(evento: MoverAsientoEvento): void {
    const origen = this.clave(evento.origen.piso, evento.origen.fila, evento.origen.columna);
    const destino = this.clave(evento.destino.piso, evento.destino.fila, evento.destino.columna);
    const actual = { ...this.celdas() };

    if (origen === destino || actual[origen] === undefined) {
      return;
    }

    // Si la casilla destino está ocupada, los dos asientos intercambian lugar.
    const tipoDestino = actual[destino];
    actual[destino] = actual[origen];

    if (tipoDestino === undefined) {
      delete actual[origen];
    } else {
      actual[origen] = tipoDestino;
    }

    this.celdas.set(actual);
    this.seleccion.set(evento.destino);
  }

  eliminarSeleccionado(): void {
    const s = this.seleccion();

    if (!s) {
      return;
    }

    const actual = { ...this.celdas() };
    delete actual[this.clave(s.piso, s.fila, s.columna)];
    this.celdas.set(actual);
    this.seleccion.set(null);
  }

  // Distribución inicial 2 + 2 con pasillo central, repartida por piso.
  generar(): void {
    const total = this.limitar(Number(this.cantidad()), 1, MAX_ASIENTOS);
    this.cantidad.set(total);

    const pisos = this.pisos();
    const porPiso = Math.ceil(total / pisos);
    const filas = Math.min(Math.ceil(porPiso / 4), MAX_FILAS);
    const columnasConAsiento = [1, 2, 4, 5];
    const nuevas: Record<string, number> = {};

    const tipo = this.tipoSeleccionado() ?? this.tipos()[0]?.id;

    if (tipo === undefined) {
      this.errorGuardar.set('No hay tipos de asiento disponibles.');
      return;
    }

    let restantes = total;

    for (let piso = 1; piso <= pisos && restantes > 0; piso++) {
      let enPiso = Math.min(porPiso, restantes);

      for (let fila = 1; fila <= filas && enPiso > 0; fila++) {
        for (const columna of columnasConAsiento) {
          if (enPiso === 0) {
            break;
          }
          nuevas[this.clave(piso, fila, columna)] = tipo;
          enPiso--;
          restantes--;
        }
      }
    }

    this.errorGuardar.set(null);
    this.filas.set(filas);
    this.columnas.set(5);
    this.celdas.set(nuevas);
    this.seleccion.set(null);
  }

  vaciar(): void {
    if (this.totalAsientos() > 0 && !confirm('¿Quitar todos los asientos del diseño?')) {
      return;
    }

    this.celdas.set({});
    this.seleccion.set(null);
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

  cambiarPrecio(valor: string): void {
    const numero = Number(valor);
    this.precioEjemplo.set(Number.isFinite(numero) && numero >= 0 ? numero : 0);
  }

  cambiarCantidad(valor: string): void {
    this.cantidad.set(this.limitar(Number(valor), 1, MAX_ASIENTOS));
  }

  guardar(): void {
    this.errorGuardar.set(null);

    const id = this.plantillaId();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.totalAsientos() === 0) {
      this.errorGuardar.set('Coloca al menos un asiento en el diseño.');
      return;
    }

    this.guardando.set(true);

    if (id !== null) {
      // Primero los datos de la plantilla (nombre y baño) y luego su diseño.
      const datos = this.form.getRawValue();

      this.plantillaService.actualizar(id, {
        nombre: (datos.nombre ?? '').trim(),
        tieneBanio: datos.tieneBanio ?? false
      }).subscribe({
        next: () => this.guardarDisposicion(id),
        error: (e: unknown) => {
          this.guardando.set(false);
          this.errorGuardar.set(
            mensajeError(e, 'No se pudieron guardar los datos de la plantilla. Inténtalo de nuevo.')
          );
        }
      });
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
        this.recienCreada = true;
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

  private colocar(pos: PosicionAsiento, tipoId: number): void {
    this.celdas.set({
      ...this.celdas(),
      [this.clave(pos.piso, pos.fila, pos.columna)]: tipoId
    });
  }

  /** Cierto cuando la plantilla se creó en este mismo guardado. */
  private recienCreada = false;

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
              this.recienCreada
                ? 'La plantilla se creó, pero no se pudieron guardar los asientos. Inténtalo de nuevo.'
                : 'No se pudieron guardar los asientos. Inténtalo de nuevo.'
            )
          );
        }
      });
  }

  private construirAsientos(): CrearAsientoPlantillaRequest[] {
    const numeros = this.numeracion();

    return this.asientosMapa().map(a => ({
      tipoAsientoId: a.tipoId,
      numero: numeros[this.clave(a.piso, a.fila, a.columna)],
      piso: a.piso,
      fila: a.fila,
      columna: a.columna
    }));
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

    const s = this.seleccion();
    if (s && recortadas[this.clave(s.piso, s.fila, s.columna)] === undefined) {
      this.seleccion.set(null);
    }
  }

  private clave(piso: number, fila: number, columna: number): string {
    return `${piso}-${fila}-${columna}`;
  }

  private esMisma(a: PosicionAsiento | null, b: PosicionAsiento): boolean {
    return !!a && a.piso === b.piso && a.fila === b.fila && a.columna === b.columna;
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
          tieneBanio: plantilla.tieneBanio
        });
        this.form.disable();
        this.tieneBanio.set(plantilla.tieneBanio);
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
