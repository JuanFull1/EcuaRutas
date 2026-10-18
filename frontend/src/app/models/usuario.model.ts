export type RolUsuario =
  | 'ADMIN'
  | 'COOPERATIVA'
  | 'OFICINISTA'
  | 'CLIENTE'
  | 'BUS';

export interface Usuario {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: RolUsuario;
  cooperativaId: number | null;
}

export interface LoginResponse {
  token: string;
  expiraEn: string;
  usuario: Usuario;
}