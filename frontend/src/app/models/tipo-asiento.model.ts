export interface TipoAsiento {
  id: number;
  cooperativaId: number | null;
  nombre: string;
  recargoPorcentaje: number;
  activo: boolean;
}

export interface CrearTipoAsientoRequest {
  cooperativaId?: number | null;
  nombre: string;
  recargoPorcentaje: number;
}

export interface ActualizarTipoAsientoRequest {
  nombre: string;
  recargoPorcentaje: number;
}
