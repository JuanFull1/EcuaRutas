using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.HojasRuta;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace EcuaRutas.Api.Services;

public class HojaRutaService : IHojaRutaService
{
    private readonly EcuaRutasDbContext _db;

    public HojaRutaService(EcuaRutasDbContext db) => _db = db;

    public async Task<HojaRutaDto> CrearManualAsync(
        CrearHojaRutaManualDto dto, long? cooperativaContexto, CancellationToken ct = default)
    {
        ValidarEntradaManual(dto);
        var cooperativaId = ResolverCooperativa(cooperativaContexto, dto.CooperativaId);
        var fecha = dto.Fecha!.Value;
        var horas = await ValidarReferenciasManualAsync(cooperativaId, dto, ct);

        if (await _db.HojasRuta.AnyAsync(h => h.GrupoBusId == dto.GrupoBusId && h.Fecha == fecha, ct))
            throw new ReglaNegocioException(409, "Ya existe una hoja de ruta para ese grupo y fecha.");

        var hoja = new HojasRutum
        {
            CooperativaId = cooperativaId,
            GrupoBusId = dto.GrupoBusId,
            Fecha = fecha,
            ModoGeneracion = ModosGeneracion.Manual,
            Estado = EstadosHojaRuta.Borrador,
            HojaRutaDetalles = dto.Detalles.Select(d => new HojaRutaDetalle
            {
                BusId = d.BusId,
                FrecuenciaId = d.FrecuenciaId,
                TipoAsignacion = d.TipoAsignacion,
                OrdenDia = d.OrdenDia,
                HoraProgramada = ResolverHora(d.HoraProgramada, d.FrecuenciaId, horas),
                Observacion = d.Observacion
            }).ToList()
        };

        _db.HojasRuta.Add(hoja);
        await GuardarCambiosAsync(ct);
        return MapearADto(hoja);
    }

    public Task<IReadOnlyList<HojaRutaDto>> GenerarAutomaticaAsync(
        GenerarHojasRutaAutomaticaDto dto, long? cooperativaContexto, CancellationToken ct = default)
        => throw new NotImplementedException();

    public async Task<HojaRutaDto> ObtenerPorIdAsync(
        long id, long? cooperativaContexto, CancellationToken ct = default)
    {
        var hoja = await _db.HojasRuta.AsNoTracking()
            .Include(h => h.HojaRutaDetalles)
            .FirstOrDefaultAsync(h => h.Id == id
                && (cooperativaContexto == null || h.CooperativaId == cooperativaContexto), ct)
            ?? throw new ReglaNegocioException(404, "La hoja de ruta no existe.");

        return MapearADto(hoja);
    }

    public async Task<IReadOnlyList<HojaRutaResumenDto>> ListarAsync(
        long? cooperativaContexto, long? grupoBusId, DateOnly? desde, DateOnly? hasta, CancellationToken ct = default)
    {
        if (desde is not null && hasta is not null && hasta.Value < desde.Value)
            throw new ReglaNegocioException(400, "El rango de fechas no es válido.");

        var q = _db.HojasRuta.AsNoTracking().Include(h => h.HojaRutaDetalles).AsQueryable();
        if (cooperativaContexto is not null) q = q.Where(h => h.CooperativaId == cooperativaContexto);
        if (grupoBusId is not null) q = q.Where(h => h.GrupoBusId == grupoBusId);
        if (desde is not null) q = q.Where(h => h.Fecha >= desde.Value);
        if (hasta is not null) q = q.Where(h => h.Fecha <= hasta.Value);

        var hojas = await q.OrderByDescending(h => h.Fecha).ThenBy(h => h.GrupoBusId).ToListAsync(ct);
        return hojas.Select(MapearAResumen).ToList();
    }
    private static HojaRutaDto MapearADto(HojasRutum h) => new(
        h.Id, h.CooperativaId, h.GrupoBusId, h.Fecha, h.ModoGeneracion, h.Estado, h.CreadoEn,
        h.HojaRutaDetalles
            .OrderBy(d => d.OrdenDia).ThenBy(d => d.BusId)
            .Select(d => new HojaRutaDetalleDto(
                d.Id, d.HojaRutaId, d.BusId, d.FrecuenciaId, d.TipoAsignacion,
                d.OrdenDia, d.HoraProgramada, d.Observacion))
            .ToList());

    private static HojaRutaResumenDto MapearAResumen(HojasRutum h) => new(
        h.Id, h.GrupoBusId, h.Fecha, h.ModoGeneracion, h.Estado,
        h.HojaRutaDetalles.Count(d => d.TipoAsignacion == TiposAsignacion.Servicio),
        h.HojaRutaDetalles.Count(d => d.TipoAsignacion == TiposAsignacion.Parada));

    public Task<HojaRutaDto> PublicarAsync(
        long id, long? cooperativaContexto, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task<HojaRutaDto> CerrarAsync(
        long id, long? cooperativaContexto, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task<HojaRutaDto> SustituirBusAsync(
        long hojaRutaId, long detalleId, SustituirBusDto dto, long? cooperativaContexto, CancellationToken ct = default)
        => throw new NotImplementedException();

    private static long ResolverCooperativa(long? contexto, long? dtoId)
    {
        if (contexto is null && dtoId is null)
            throw new ReglaNegocioException(400, "La cooperativa es obligatoria.");
        if (contexto is not null && dtoId is not null && contexto != dtoId)
            throw new ReglaNegocioException(403, "No puede operar sobre otra cooperativa.");
        return contexto ?? dtoId!.Value;
    }

    private static TimeOnly? ResolverHora(
        TimeOnly? explicita, long? frecuenciaId, IReadOnlyDictionary<long, TimeOnly> horas)
        => explicita ?? (frecuenciaId is long f && horas.TryGetValue(f, out var h) ? h : (TimeOnly?)null);

    private static void ValidarEntradaManual(CrearHojaRutaManualDto dto)
    {
        if (dto.Fecha is null || dto.Fecha.Value == default)
            throw new ReglaNegocioException(400, "La fecha de la hoja de ruta no es válida.");

        if (dto.Detalles is null || dto.Detalles.Count == 0)
            throw new ReglaNegocioException(400, "La hoja de ruta debe tener al menos un detalle.");

        var vistos = new HashSet<(long BusId, int Orden)>();
        foreach (var d in dto.Detalles)
        {
            switch (d.TipoAsignacion)
            {
                case TiposAsignacion.Servicio when d.FrecuenciaId is null:
                    throw new ReglaNegocioException(400, $"El bus {d.BusId} en SERVICIO requiere frecuencia.");
                case TiposAsignacion.Parada when d.FrecuenciaId is not null:
                    throw new ReglaNegocioException(400, $"El bus {d.BusId} en PARADA no debe tener frecuencia.");
                case TiposAsignacion.Servicio:
                case TiposAsignacion.Parada:
                    break;
                default:
                    throw new ReglaNegocioException(400, "El tipo de asignación debe ser SERVICIO o PARADA.");
            }

            if (!vistos.Add((d.BusId, d.OrdenDia)))
                throw new ReglaNegocioException(400, $"El bus {d.BusId} está repetido en el orden {d.OrdenDia}.");
        }
    }

}