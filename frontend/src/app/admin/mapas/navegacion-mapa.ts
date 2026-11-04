import type { ParamMap } from '@angular/router';

// Los DTOs usan identificadores int32 positivos. Un parámetro repetido es ambiguo.
export function identificadorMapa(parametros: ParamMap, nombre: string): number | null | 'invalido' {
  if (!parametros.has(nombre)) return null;
  const valores = parametros.getAll(nombre);
  const texto = valores[0];
  if (valores.length !== 1 || !/^[1-9]\d*$/.test(texto)) return 'invalido';
  const id = Number(texto);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : 'invalido';
}
