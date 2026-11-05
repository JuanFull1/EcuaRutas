export type TipoLugar = 'CIUDAD' | 'TERMINAL' | 'PARADA';

export interface CoordenadasDto {
  latitud: number;
  longitud: number;
}

export interface CrearLugarDto {
  nombre: string;
  provincia: string | null;
  canton: string | null;
  tipo: TipoLugar;
  ubicacion: CoordenadasDto | null;
}

export interface ActualizarLugarDto extends CrearLugarDto {
  activo: boolean;
}

export interface LugarDto extends ActualizarLugarDto {
  // El API serializa long como número JSON, igual que los demás identificadores del proyecto.
  id: number;
}
