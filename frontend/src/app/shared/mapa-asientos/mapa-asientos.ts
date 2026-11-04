import { Component, computed, input, output, signal } from '@angular/core';

export interface PosicionAsiento {
  piso: number;
  fila: number;
  columna: number;
}

export interface AsientoMapa extends PosicionAsiento {
  numero: string;
  tipoId: number;
  tipoNombre: string;
  /** Índice de color (0 a 5) según el tipo de asiento. */
  colorIndex: number;
  precio?: number | null;
  estado?: 'LIBRE' | 'OCUPADO' | 'SELECCIONADO';
}

export interface MoverAsientoEvento {
  origen: PosicionAsiento;
  destino: PosicionAsiento;
}

export interface SoltarTipoEvento {
  tipoId: number;
  destino: PosicionAsiento;
}

/**
 * Dibuja el bus a partir de la disposición de asientos (piso, fila y columna).
 * En modo editable permite arrastrar asientos; en modo lectura sirve para que
 * el cliente elija un asiento y vea su precio.
 */
@Component({
  selector: 'app-mapa-asientos',
  standalone: true,
  templateUrl: './mapa-asientos.html',
  styleUrl: './mapa-asientos.css'
})
export class MapaAsientos {

  readonly pisos = input(1);
  readonly filas = input.required<number>();
  readonly columnas = input.required<number>();
  readonly asientos = input<AsientoMapa[]>([]);
  readonly editable = input(false);
  readonly tieneBanio = input(false);
  readonly mostrarPrecio = input(false);
  readonly seleccionado = input<PosicionAsiento | null>(null);
  /** Con varios pisos: una pestaña por piso o todos a la vez. */
  readonly vistaPisos = input<'pestanas' | 'juntos'>('pestanas');

  readonly celdaClick = output<PosicionAsiento>();
  readonly mover = output<MoverAsientoEvento>();
  readonly soltarTipo = output<SoltarTipoEvento>();

  readonly listaPisos = computed(() =>
    Array.from({ length: this.pisos() }, (_, i) => i + 1)
  );
  readonly listaFilas = computed(() =>
    Array.from({ length: this.filas() }, (_, i) => i + 1)
  );
  readonly listaColumnas = computed(() =>
    Array.from({ length: this.columnas() }, (_, i) => i + 1)
  );

  private readonly pisoElegido = signal(1);

  readonly pisoActivo = computed(() => Math.min(this.pisoElegido(), this.pisos()));

  readonly pisosVisibles = computed(() =>
    this.vistaPisos() === 'pestanas' && this.pisos() > 1
      ? [this.pisoActivo()]
      : this.listaPisos()
  );

  elegirPiso(piso: number): void {
    this.pisoElegido.set(piso);
  }

  asientosDelPiso(piso: number): number {
    return this.asientos().filter(a => a.piso === piso).length;
  }

  private readonly indice = computed(() => {
    const mapa = new Map<string, AsientoMapa>();
    for (const a of this.asientos()) {
      mapa.set(this.clave(a.piso, a.fila, a.columna), a);
    }
    return mapa;
  });

  readonly leyenda = computed(() => {
    const tipos = new Map<number, AsientoMapa>();
    for (const a of this.asientos()) {
      if (!tipos.has(a.tipoId)) {
        tipos.set(a.tipoId, a);
      }
    }
    return [...tipos.values()];
  });

  // Columnas sin asientos que quedan entre columnas con asientos: son el pasillo.
  private readonly pasillos = computed(() => {
    const porPiso = new Map<number, Set<number>>();

    for (const piso of this.listaPisos()) {
      const ocupadas = this.asientos()
        .filter(a => a.piso === piso)
        .map(a => a.columna);

      const pasillo = new Set<number>();

      if (ocupadas.length > 0) {
        const minima = Math.min(...ocupadas);
        const maxima = Math.max(...ocupadas);

        for (let c = minima + 1; c < maxima; c++) {
          if (!ocupadas.includes(c)) {
            pasillo.add(c);
          }
        }
      }

      porPiso.set(piso, pasillo);
    }

    return porPiso;
  });

  esPasillo(piso: number, columna: number): boolean {
    return this.pasillos().get(piso)?.has(columna) ?? false;
  }

  asientoEn(piso: number, fila: number, columna: number): AsientoMapa | undefined {
    return this.indice().get(this.clave(piso, fila, columna));
  }

  esSeleccionado(piso: number, fila: number, columna: number): boolean {
    const s = this.seleccionado();
    return !!s && s.piso === piso && s.fila === fila && s.columna === columna;
  }

  titulo(a: AsientoMapa): string {
    const precio = a.precio != null ? ` · $${a.precio.toFixed(2)}` : '';
    return `Asiento ${a.numero} · ${a.tipoNombre}${precio}`;
  }

  alHacerClic(piso: number, fila: number, columna: number): void {
    const a = this.asientoEn(piso, fila, columna);

    if (!this.editable() && (!a || a.estado === 'OCUPADO')) {
      return;
    }

    this.celdaClick.emit({ piso, fila, columna });
  }

  alArrastrarAsiento(ev: DragEvent, a: AsientoMapa): void {
    if (!this.editable() || !ev.dataTransfer) {
      return;
    }

    ev.dataTransfer.setData(
      'application/x-asiento',
      JSON.stringify({ piso: a.piso, fila: a.fila, columna: a.columna })
    );
    ev.dataTransfer.effectAllowed = 'move';
  }

  alPasarSobre(ev: DragEvent): void {
    if (this.editable()) {
      ev.preventDefault();
    }
  }

  alSoltar(ev: DragEvent, piso: number, fila: number, columna: number): void {
    if (!this.editable() || !ev.dataTransfer) {
      return;
    }

    ev.preventDefault();
    const destino = { piso, fila, columna };

    const tipo = ev.dataTransfer.getData('application/x-tipo');
    if (tipo) {
      this.soltarTipo.emit({ tipoId: Number(tipo), destino });
      return;
    }

    const origen = ev.dataTransfer.getData('application/x-asiento');
    if (origen) {
      try {
        this.mover.emit({ origen: JSON.parse(origen) as PosicionAsiento, destino });
      } catch {
        // Datos de arrastre no válidos: se ignoran.
      }
    }
  }

  private clave(piso: number, fila: number, columna: number): string {
    return `${piso}-${fila}-${columna}`;
  }
}
