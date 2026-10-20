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

    public Task<HojaRutaDto> ObtenerPorIdAsync(
        long id, long? cooperativaContexto, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task<IReadOnlyList<HojaRutaResumenDto>> ListarAsync(
        long? cooperativaContexto, long? grupoBusId, DateOnly? desde, DateOnly? hasta, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task<HojaRutaDto> PublicarAsync(
        long id, long? cooperativaContexto, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task<HojaRutaDto> CerrarAsync(
        long id, long? cooperativaContexto, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task<HojaRutaDto> SustituirBusAsync(
        long hojaRutaId, long detalleId, SustituirBusDto dto, long? cooperativaContexto, CancellationToken ct = default)
        => throw new NotImplementedException();
}