export interface CrearFrecuenciaDto {
  cooperativaId: number;
  rutaId: number;
  resolucionAntId: number;
  codigo: string | null;
  horaSalida: string;
}

export interface ActualizarFrecuenciaDto extends CrearFrecuenciaDto {
  activa: boolean;
}

export interface FrecuenciaDto extends ActualizarFrecuenciaDto {
  id: number;
}

// HTML trabaja con HH:mm. TimeOnly puede contener segundos y siete decimales.
// Una edición sin cambio de minuto conserva el horario original completo.
export function horaParaApi(hora: string, actual: FrecuenciaDto | null): string {
  return actual && hora === actual.horaSalida.slice(0, 5) ? actual.horaSalida : `${hora}:00`;
}

export function cambiaEstructura(actual: FrecuenciaDto, propuesta: CrearFrecuenciaDto): boolean {
  return actual.cooperativaId !== propuesta.cooperativaId || actual.rutaId !== propuesta.rutaId ||
    actual.resolucionAntId !== propuesta.resolucionAntId || actual.horaSalida !== propuesta.horaSalida;
}
