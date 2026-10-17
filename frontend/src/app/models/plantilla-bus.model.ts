export interface PlantillaBus {
  id: number;
  cooperativaId: number | null;
  nombre: string;
  pisos: number;
  tieneBanio: boolean;
  activa: boolean;
}

export interface CrearPlantillaBusRequest {
  cooperativaId?: number | null;
  nombre: string;
  pisos: number;
  tieneBanio: boolean;
}