export interface GrupoBus {
  id: number;
  cooperativaId: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface CrearGrupoBusRequest {
  cooperativaId: number;
  nombre: string;
  descripcion?: string;
}

export interface ActualizarGrupoBusRequest {
  nombre: string;
  descripcion?: string;
  activo: boolean;
}