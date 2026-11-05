export interface AdminUsuario {
  id: number;
  cedula: string | null;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string | null;

  activo: boolean;

  rolId: number;
  rolCodigo: string;
  rolNombre: string;

  cooperativaId: number | null;
  cooperativaNombre: string | null;

  creadoEn: string;
  actualizadoEn: string;
}

export interface AdminRol {
  id: number;
  codigo: string;
  nombre: string;
  cantidadUsuarios: number;
}

export interface CooperativaResumen {
  id: number;
  nombre: string;
}

export interface CrearAdminUsuario {
  cedula: string | null;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string | null;
  password: string;
  rolId: number;
  cooperativaId: number | null;
  activo: boolean;
}

export interface ActualizarAdminUsuario {
  cedula: string | null;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string | null;
  rolId: number;
  cooperativaId: number | null;
}

export interface RestablecerPassword {
  nuevaPassword: string;
  confirmarPassword: string;
}