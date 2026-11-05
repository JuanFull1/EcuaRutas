export interface AsientoBus {
  id: number;
  busId: number;
  tipoAsientoId: number;
  tipoAsiento: string;
  recargoPorcentaje: number;
  numero: string;
  piso: number;
  fila: number | null;
  columna: number | null;
  activo: boolean;
}
