export interface Usuario {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  password: string;
  rol: 'ADMIN' | 'COOPERATIVA' | 'OFICINISTA' | 'CLIENTE' | 'BUS';
}