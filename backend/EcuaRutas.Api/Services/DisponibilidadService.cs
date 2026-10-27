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

    public async Task<List<LugarDisponibilidadResponse>>
    ObtenerLugaresAsync()
{
    var lugares = await _context.RutaParadas
        .AsNoTracking()
        .Include(rp => rp.Lugar)
        .Include(rp => rp.Ruta)
        .Where(rp =>
            rp.Lugar.Activo &&
            rp.Ruta.Activa)
        .Select(rp => new LugarDisponibilidadResponse
        {
            LugarId = rp.LugarId,
            Nombre = rp.Lugar.Nombre,
            Provincia = rp.Lugar.Provincia,
            Canton = rp.Lugar.Canton
        })
        .Distinct()
        .OrderBy(l => l.Nombre)
        .ToListAsync();

    return lugares;
}

public async Task<List<ViajeDisponibilidadResponse>>
    BuscarViajesAsync(
        long origenLugarId,
        long destinoLugarId,
        DateTime fecha)
{
    if (origenLugarId <= 0)
    {
        throw new ArgumentException(
            "El origen es obligatorio.");
    }

    if (destinoLugarId <= 0)
    {
        throw new ArgumentException(
            "El destino es obligatorio.");
    }

    if (origenLugarId == destinoLugarId)
    {
        throw new ArgumentException(
            "El origen y destino no pueden ser iguales.");
    }

   var zonaEcuador = TimeZoneInfo.FindSystemTimeZoneById(
    OperatingSystem.IsWindows()
        ? "SA Pacific Standard Time"
        : "America/Guayaquil"
);

var inicioDiaLocal = DateTime.SpecifyKind(
    fecha.Date,
    DateTimeKind.Unspecified
);

var finDiaLocal = inicioDiaLocal.AddDays(1);

var inicioDia = TimeZoneInfo.ConvertTimeToUtc(
    inicioDiaLocal,
    zonaEcuador
);

var finDia = TimeZoneInfo.ConvertTimeToUtc(
    finDiaLocal,
    zonaEcuador
);

    var viajes = await _context.Viajes
        .AsNoTracking()
        .Include(v => v.Bus)
        .Include(v => v.Frecuencia)
            .ThenInclude(f => f.Cooperativa)
        .Include(v => v.Frecuencia)
            .ThenInclude(f => f.Ruta)
                .ThenInclude(r => r.RutaParada)
                    .ThenInclude(rp => rp.Lugar)
        .Include(v => v.Frecuencia)
            .ThenInclude(f => f.TarifasFrecuencia)
        .Where(v =>
            v.SalidaProgramada >= inicioDia &&
            v.SalidaProgramada < finDia &&
            (v.Estado == "PROGRAMADO" ||
             v.Estado == "ABIERTO") &&
            v.Frecuencia.Activa &&
            v.Frecuencia.Ruta.Activa &&
            v.Bus.Estado != "INACTIVO")
        .ToListAsync();

    var resultado = new List<ViajeDisponibilidadResponse>();

    foreach (var viaje in viajes)
    {
        var paradas = viaje.Frecuencia.Ruta.RutaParada
            .OrderBy(rp => rp.Orden)
            .ToList();

        var origen = paradas
            .FirstOrDefault(rp =>
                rp.LugarId == origenLugarId);

        var destino = paradas
            .FirstOrDefault(rp =>
                rp.LugarId == destinoLugarId);

        if (origen == null || destino == null)
        {
            continue;
        }

        if (destino.Orden <= origen.Orden)
        {
            continue;
        }

        var tarifa = viaje.Frecuencia.TarifasFrecuencia
            .FirstOrDefault(t =>
                t.Activa &&
                t.OrigenRutaParadaId == origen.Id &&
                t.DestinoRutaParadaId == destino.Id);

        if (tarifa == null)
        {
            continue;
        }

        resultado.Add(
            new ViajeDisponibilidadResponse
            {
                ViajeId = viaje.Id,
                FrecuenciaId = viaje.FrecuenciaId,
                RutaId = viaje.Frecuencia.RutaId,
                RutaNombre = viaje.Frecuencia.Ruta.Nombre,
                CodigoFrecuencia = viaje.Frecuencia.Codigo,
                SalidaProgramada = viaje.SalidaProgramada,
                Estado = viaje.Estado,

                BusId = viaje.BusId,
                NumeroInternoBus =
                    viaje.Bus.NumeroInterno,
                PlacaBus =
                    viaje.Bus.Placa,
                CapacidadBus =
                    viaje.Bus.Capacidad,

                OrigenRutaParadaId =
                    origen.Id,

                DestinoRutaParadaId =
                    destino.Id,

                PrecioBase =
                    tarifa.PrecioBase,

                Cooperativa =
                    viaje.Frecuencia.Cooperativa.Nombre
            });
    }

    return resultado
        .OrderBy(v => v.SalidaProgramada)
        .ToList();
}
}