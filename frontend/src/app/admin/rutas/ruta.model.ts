export type TipoViaje = 'DIRECTO' | 'CON_PARADAS';

export interface CrearRutaDto {
  nombre: string;
  origenLugarId: number;
  destinoLugarId: number;
  tipoViaje: TipoViaje;
}

export interface ActualizarRutaDto extends CrearRutaDto {
  activa: boolean;
}

export interface RutaDto extends ActualizarRutaDto {
  id: number;
}
