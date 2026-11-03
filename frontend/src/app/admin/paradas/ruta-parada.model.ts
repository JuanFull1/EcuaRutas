export interface CrearRutaParadaDto {
  lugarId: number;
  orden: number;
  kmAcumulado: number | null;
  minutosAcumulados: number | null;
  permiteAscenso: boolean;
  permiteDescenso: boolean;
}

export interface ActualizarRutaParadaDto extends CrearRutaParadaDto {}

export interface RutaParadaDto extends ActualizarRutaParadaDto {
  id: number;
  rutaId: number;
}
