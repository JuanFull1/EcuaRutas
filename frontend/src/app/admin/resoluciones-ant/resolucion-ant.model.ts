export interface ResolucionAntDto {
  id: number;
  cooperativaId: number;
  numeroResolucion: string;
  fechaResolucion: string | null;
  archivoUrl: string | null;
  activa: boolean;
}

export interface CrearResolucionAntDto {
  cooperativaId: number;
  numeroResolucion: string;
  fechaResolucion: string | null;
  archivoUrl: string | null;
}

export interface ActualizarResolucionAntDto extends CrearResolucionAntDto {
  activa: boolean;
}
