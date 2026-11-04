export type TipoAsignacion = 'SERVICIO' | 'PARADA';

export interface HojaRutaDetalle {
  id: number;
  hojaRutaId: number;
  busId: number;
  frecuenciaId: number | null;
  tipoAsignacion: TipoAsignacion;
  ordenDia: number;
  horaProgramada: string | null;
  observacion: string | null;
}

export interface HojaRuta {
  id: number;
  cooperativaId: number;
  grupoBusId: number;
  fecha: string;
  modoGeneracion: string;
  estado: string;
  creadoEn: string;
  detalles: HojaRutaDetalle[];
}

export interface HojaRutaResumen {
  id: number;
  grupoBusId: number;
  fecha: string;
  modoGeneracion: string;
  estado: string;
  totalServicios: number;
  totalParadas: number;
}

export interface DetalleHojaRutaManual {
  busId: number;
  frecuenciaId: number | null;
  tipoAsignacion: TipoAsignacion;
  ordenDia: number;
  horaProgramada?: string | null;
  observacion?: string | null;
}

export interface CrearHojaRutaManual {
  grupoBusId: number;
  fecha: string;
  detalles: DetalleHojaRutaManual[];
}

export interface GenerarHojasRutaAutomatica {
  grupoBusId: number;
  fechaInicio: string;
  fechaFin: string;
  frecuencias: { frecuenciaId: number; horaProgramada?: string | null }[];
}

export interface SustituirBus {
  busReemplazoId: number;
  observacion: string;
}