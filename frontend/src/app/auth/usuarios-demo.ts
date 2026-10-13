import { Usuario } from '../models/usuario.model';

const USUARIOS_KEY = 'ecuarutas_usuarios_demo';

export function inicializarUsuariosDemo(): void {
  const usuariosGuardados = localStorage.getItem(USUARIOS_KEY);

  if (usuariosGuardados) {
    return;
  }

  const usuarios: Usuario[] = [
    {
      id: 1,
      nombres: 'Administrador',
      apellidos: 'EcuaRutas',
      correo: 'admin@ecuarutas.local',
      password: 'Admin123*',
      rol: 'ADMIN'
    }
  ];

  localStorage.setItem(
    USUARIOS_KEY,
    JSON.stringify(usuarios)
  );
}

export function obtenerUsuariosDemo(): Usuario[] {
  const datos = localStorage.getItem(USUARIOS_KEY);

  if (!datos) {
    return [];
  }

  return JSON.parse(datos) as Usuario[];
}