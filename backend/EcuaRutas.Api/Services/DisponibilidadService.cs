using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Ventas;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Services;

public class DisponibilidadService
{
    private readonly EcuaRutasDbContext _context;

    public DisponibilidadService(EcuaRutasDbContext context)
    {
        _context = context;
    }

    public async Task<DisponibilidadResponse?> ConsultarAsync(
        long viajeId,
        long origenRutaParadaId,
        long destinoRutaParadaId)
    {
        var viaje = await _context.Viajes
            .Include(v => v.Frecuencia)
            .Include(v => v.Bus)
                .ThenInclude(b => b.AsientosBus)
                    .ThenInclude(a => a.TipoAsiento)
            .FirstOrDefaultAsync(v => v.Id == viajeId);

        if (viaje == null)
        {
            return null;
        }

        var origen = await _context.RutaParadas
            .FirstOrDefaultAsync(p => p.Id == origenRutaParadaId);

        var destino = await _context.RutaParadas
            .FirstOrDefaultAsync(p => p.Id == destinoRutaParadaId);

        if (origen == null || destino == null)
        {
            return null;
        }

        if (origen.RutaId != destino.RutaId)
        {
            return null;
        }

        if (origen.Orden >= destino.Orden)
        {
            return null;
        }

        if (viaje.Frecuencia.RutaId != origen.RutaId)
        {
            return null;
        }

        var tarifa = await _context.TarifasFrecuencia
            .FirstOrDefaultAsync(t =>
                t.FrecuenciaId == viaje.FrecuenciaId &&
                t.OrigenRutaParadaId == origenRutaParadaId &&
                t.DestinoRutaParadaId == destinoRutaParadaId &&
                t.Activa);

        if (tarifa == null)
        {
            return null;
        }

        var asientosOcupados = await _context.VentaAsientos
            .Where(v =>
                v.ViajeId == viajeId &&
                (
                    v.EstadoAsiento == "RETENIDO" ||
                    v.EstadoAsiento == "CONFIRMADO" ||
                    v.EstadoAsiento == "UTILIZADO"
                ) &&
                v.OrdenOrigen < destino.Orden &&
                v.OrdenDestino > origen.Orden
            )
            .Select(v => v.AsientoBusId)
            .ToListAsync();

        var asientosDisponibles = viaje.Bus.AsientosBus
            .Where(a =>
                a.Activo &&
                !asientosOcupados.Contains(a.Id) &&
                a.TipoAsiento.Activo
            )
            .OrderBy(a => a.Piso)
            .ThenBy(a => a.Fila)
            .ThenBy(a => a.Columna)
            .ThenBy(a => a.Numero)
            .Select(a =>
            {
                var recargo = tarifa.PrecioBase *
                               a.TipoAsiento.RecargoPorcentaje / 100m;

                return new AsientoDisponibleDto
                {
                    AsientoBusId = a.Id,
                    Numero = a.Numero,
                    Piso = a.Piso,
                    Fila = a.Fila,
                    Columna = a.Columna,
                    TipoAsientoId = a.TipoAsientoId,
                    TipoAsiento = a.TipoAsiento.Nombre,
                    RecargoPorcentaje = a.TipoAsiento.RecargoPorcentaje,
                    PrecioBase = tarifa.PrecioBase,
                    RecargoAsiento = recargo,
                    PrecioFinal = tarifa.PrecioBase + recargo
                };
            })
            .ToList();

        return new DisponibilidadResponse
        {
            ViajeId = viajeId,
            OrigenRutaParadaId = origenRutaParadaId,
            DestinoRutaParadaId = destinoRutaParadaId,
            Asientos = asientosDisponibles
        };
    }
}