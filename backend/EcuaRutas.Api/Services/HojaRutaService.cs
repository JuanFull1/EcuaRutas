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

    public Task<HojaRutaDto> CrearManualAsync(
        CrearHojaRutaManualDto dto, long? cooperativaContexto, CancellationToken ct = default)
        => throw new NotImplementedException();

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