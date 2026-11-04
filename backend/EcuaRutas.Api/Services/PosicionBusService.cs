using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.PosicionesBus;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace EcuaRutas.Api.Services;

public class PosicionBusService : IPosicionBusService
{
    private readonly EcuaRutasDbContext _db;
    private readonly IPosicionBusNotifier _notifier;

    public PosicionBusService(EcuaRutasDbContext db, IPosicionBusNotifier notifier)
    {
        _db = db;
        _notifier = notifier;
    }

    public async Task<PosicionBusDto> RegistrarAsync(
        long viajeId, long usuarioBusId, RegistrarPosicionBusDto dto, CancellationToken ct = default)
    {
        var viaje = await _db.Viajes.AsNoTracking().FirstOrDefaultAsync(v => v.Id == viajeId, ct)
            ?? throw new ReglaNegocioException(404, "El viaje no existe.");
        if (viaje.UsuarioBusId != usuarioBusId)
            throw new ReglaNegocioException(403, "El viaje no está asignado a este usuario.");
        if (viaje.Estado != EstadosViaje.EnCurso)
            throw new ReglaNegocioException(409, "Solo se registra posición de un viaje EN_CURSO.");

        var posicion = new PosicionesBu
        {
            ViajeId = viaje.Id,
            BusId = viaje.BusId,
            Ubicacion = new Point(dto.Longitud, dto.Latitud) { SRID = 4326 }, // X = longitud, Y = latitud
            VelocidadKmh = dto.VelocidadKmh,
            PrecisionMetros = dto.PrecisionMetros
        };
        _db.PosicionesBus.Add(posicion);
        await _db.SaveChangesAsync(ct);

        var resultado = Mapear(posicion);
        await _notifier.NotificarAsync(resultado, ct);
        return resultado;
    }

    public async Task<PosicionBusDto> ObtenerUltimaAsync(
        long viajeId, long? cooperativaContexto, CancellationToken ct = default)
    {
        var posicion = await _db.PosicionesBus.AsNoTracking()
            .Where(p => p.ViajeId == viajeId
                && (cooperativaContexto == null || p.Viaje.Bus.CooperativaId == cooperativaContexto))
            .OrderByDescending(p => p.RegistradoEn)
            .FirstOrDefaultAsync(ct)
            ?? throw new ReglaNegocioException(404, "El viaje no tiene posiciones registradas.");
        return Mapear(posicion);
    }

    private static PosicionBusDto Mapear(PosicionesBu p) => new(
        p.Id, p.ViajeId, p.BusId, p.Ubicacion.Y, p.Ubicacion.X,
        p.VelocidadKmh, p.PrecisionMetros, p.RegistradoEn);
}