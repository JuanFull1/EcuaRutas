export type EstadoBus = 'ACTIVO' | 'MANTENIMIENTO' | 'INACTIVO';

export interface Bus {
  id: number;
  cooperativaId: number;
  grupoBusId: number | null;
  plantillaId: number | null;
  numeroInterno: string;
  placa: string;
  color: string | null;
  marcaChasis: string | null;
  marcaCarroceria: string | null;
  modelo: string | null;
  anio: number | null;
  pisos: number;
  capacidad: number;
  tieneBanio: boolean;
  fotoUrl: string | null;
  estado: EstadoBus;
}


export interface CrearBusRequest {
  cooperativaId: number;
  grupoBusId?: number | null;
  numeroInterno: string;
  placa: string;
  color?: string;
  marcaChasis?: string;
  marcaCarroceria?: string;
  modelo?: string;
  anio?: number;
  pisos: number;
  capacidad: number;
  tieneBanio: boolean;
  fotoUrl?: string;
}

export type ActualizarBusRequest = Omit<CrearBusRequest, 'cooperativaId'> & {
  estado: EstadoBus;
};