import { FrecuenciaDto } from '../frecuencias/frecuencia.model';
import { LugarDto } from '../lugares/lugar.model';
import { RutaParadaDto } from '../paradas/ruta-parada.model';

export interface CrearTarifaFrecuenciaDto {
  origenRutaParadaId: number;
  destinoRutaParadaId: number;
  precioBase: number;
}
export interface ActualizarTarifaFrecuenciaDto extends CrearTarifaFrecuenciaDto { activa: boolean; }
export interface TarifaFrecuenciaDto extends ActualizarTarifaFrecuenciaDto { id: number; frecuenciaId: number; }

// La precisión se comprueba sobre la entrada original, antes de Number/JSON.
// Los centavos máximos caben exactamente en un entero seguro de JavaScript.
export function precioEnCentavos(valor: unknown): bigint | null {
  if (typeof valor !== 'string') return null;
  const texto = valor.trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(texto)) return null;
  const [entera, decimal = ''] = texto.replace(',', '.').split('.');
  const centavos = BigInt(entera) * 100n + BigInt(decimal.padEnd(2, '0'));
  return centavos <= 9999999999n ? centavos : null;
}

export function paradasDeFrecuencia(paradas: readonly RutaParadaDto[], frecuencia: FrecuenciaDto | null): RutaParadaDto[] {
  return paradas.filter(p => frecuencia !== null && p.rutaId === frecuencia.rutaId &&
    Number.isSafeInteger(p.id) && p.id > 0 && Number.isInteger(p.orden) && p.orden >= 0)
    .sort((a, b) => a.orden - b.orden || a.id - b.id);
}

export function etiquetaParada(parada: RutaParadaDto, lugares: readonly LugarDto[]): string {
  return `${lugares.find(l => l.id === parada.lugarId)?.nombre ?? `Lugar #${parada.lugarId}`} · Parada #${parada.id} · Orden ${parada.orden}`;
}
