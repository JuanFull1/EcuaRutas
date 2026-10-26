export interface PlantillaAsiento {
  id: number;
  plantillaId: number;
  tipoAsientoId: number;
  numero: string;
  piso: number;
  fila: number | null;
  columna: number | null;
  activo: boolean;
}

export interface CrearAsientoPlantillaRequest {
  tipoAsientoId: number;
  numero: string;
  piso: number;
  fila: number;
  columna: number;
}