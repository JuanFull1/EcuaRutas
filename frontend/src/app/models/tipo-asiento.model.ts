export interface TipoAsiento {
  id: number;
  cooperativaId: number | null;
  nombre: string;
  recargoPorcentaje: number;
  activo: boolean;
}