export type EstadoViaje = 'PROGRAMADO' | 'ABIERTO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO';

export interface Viaje {
  id: number;
  hojaRutaDetalleId: number | null;
  busId: number;
  frecuenciaId: number;
  usuarioBusId: number | null;
  salidaProgramada: string;
  iniciadoEn: string | null;
  finalizadoEn: string | null;
  estado: EstadoViaje;
}

export interface FiltroViajes {
  desde?: string;
  hasta?: string;
  estado?: string;
  busId?: number | null;
}