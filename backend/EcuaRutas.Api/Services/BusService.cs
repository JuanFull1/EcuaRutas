using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Services;

public class BusService : IBusService
{
    private readonly EcuaRutasDbContext _db;

    public BusService(EcuaRutasDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<BusDto>> ListarAsync(
        long cooperativaId,
        long? grupoBusId = null,
        string? estado = null,
        CancellationToken ct = default)
    {
        var consulta = _db.Buses
            .AsNoTracking()
            .Where(b => b.CooperativaId == cooperativaId);

        if (grupoBusId.HasValue)
            consulta = consulta.Where(b => b.GrupoBusId == grupoBusId);

        if (!string.IsNullOrWhiteSpace(estado))
            consulta = consulta.Where(b => b.Estado == estado);

        var buses = await consulta
            .OrderBy(b => b.NumeroInterno)
            .ToListAsync(ct);

        return buses.Select(Mapear).ToList();
    }

    public async Task<BusDto?> ObtenerAsync(long id, CancellationToken ct = default)
    {
        var bus = await _db.Buses
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id, ct);

        return bus is null ? null : Mapear(bus);
    }

    public async Task<BusDto> CrearAsync(CrearBusRequest request, CancellationToken ct = default)
    {
        var bus = new Bus
        {
            CooperativaId = request.CooperativaId,
            GrupoBusId = request.GrupoBusId,
            PlantillaId = request.PlantillaId,
            NumeroInterno = request.NumeroInterno.Trim(),
            Placa = request.Placa.Trim().ToUpperInvariant(),
            Color = request.Color,
            MarcaChasis = request.MarcaChasis,
            MarcaCarroceria = request.MarcaCarroceria,
            Modelo = request.Modelo,
            Anio = (short?)request.Anio,
            Pisos = (short)request.Pisos,
            Capacidad = (short)request.Capacidad,
            TieneBanio = request.TieneBanio,
            FotoUrl = request.FotoUrl,
            Estado = "ACTIVO",
            CreadoEn = DateTime.UtcNow
        };

        _db.Buses.Add(bus);
        await _db.SaveChangesAsync(ct);

        return Mapear(bus);
    }

    public async Task<BusDto?> ActualizarAsync(long id, ActualizarBusRequest request, CancellationToken ct = default)
    {
        var bus = await _db.Buses.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (bus is null)
            return null;

        bus.GrupoBusId = request.GrupoBusId;
        bus.PlantillaId = request.PlantillaId;
        bus.NumeroInterno = request.NumeroInterno.Trim();
        bus.Placa = request.Placa.Trim().ToUpperInvariant();
        bus.Color = request.Color;
        bus.MarcaChasis = request.MarcaChasis;
        bus.MarcaCarroceria = request.MarcaCarroceria;
        bus.Modelo = request.Modelo;
        bus.Anio = (short?)request.Anio;
        bus.Pisos = (short)request.Pisos;
        bus.Capacidad = (short)request.Capacidad;
        bus.TieneBanio = request.TieneBanio;
        bus.FotoUrl = request.FotoUrl;
        bus.Estado = request.Estado;

        await _db.SaveChangesAsync(ct);

        return Mapear(bus);
    }

    public Task<bool> DarDeBajaAsync(long id, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    private static BusDto Mapear(Bus bus) => new()
    {
        Id = bus.Id,
        CooperativaId = bus.CooperativaId,
        GrupoBusId = bus.GrupoBusId,
        PlantillaId = bus.PlantillaId,
        NumeroInterno = bus.NumeroInterno,
        Placa = bus.Placa,
        Color = bus.Color,
        MarcaChasis = bus.MarcaChasis,
        MarcaCarroceria = bus.MarcaCarroceria,
        Modelo = bus.Modelo,
        Anio = bus.Anio,
        Pisos = bus.Pisos,
        Capacidad = bus.Capacidad,
        TieneBanio = bus.TieneBanio,
        FotoUrl = bus.FotoUrl,
        Estado = bus.Estado
    };
}
