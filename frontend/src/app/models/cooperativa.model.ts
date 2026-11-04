export interface Cooperativa {
  id: number;
  nombre: string;
  ruc: string | null;
  descripcion: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  logoUrl: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
  redesSociales: string;
  informacionSoporte: string | null;
  activa: boolean;
  cantidadUsuarios: number;
  creadoEn: string;
}

export interface CrearCooperativa {
  nombre: string;
  ruc: string | null;

  usuarioNombres: string;
  usuarioApellidos: string;
  usuarioCorreo: string;
  usuarioPassword: string;
  usuarioConfirmarPassword: string;
}

export interface ActualizarCooperativaAdmin {
  nombre: string;
  ruc: string | null;
}

export interface ActualizarMiCooperativa {
  nombre: string;
  descripcion: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  logoUrl: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
  redesSociales: string;
  informacionSoporte: string | null;
}

export interface UsuarioAccesoCooperativa {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  activo: boolean;
  rolCodigo: string;
  cooperativaId: number | null;
}

export interface CrearCooperativaResponse {
  cooperativa: Cooperativa;
  usuario: UsuarioAccesoCooperativa;
}