using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Services;

public class GrupoBusService : IGrupoBusService
{
    private readonly EcuaRutasDbContext _db;

    public GrupoBusService(EcuaRutasDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<GrupoBusDto>> ListarAsync(
        long cooperativaId, CancellationToken ct = default)
    {
        var grupos = await _db.GruposBuses
            .AsNoTracking()
            .Where(g => g.CooperativaId == cooperativaId)
            .OrderBy(g => g.Nombre)
            .ToListAsync(ct);

        return grupos.Select(Mapear).ToList();
    }

    public async Task<GrupoBusDto?> ObtenerAsync(
        long id, CancellationToken ct = default)
    {
        var grupo = await _db.GruposBuses
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.Id == id, ct);

        return grupo is null ? null : Mapear(grupo);
    }

    public Task<GrupoBusDto> CrearAsync(
        CrearGrupoBusRequest request, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task<GrupoBusDto?> ActualizarAsync(
        long id, ActualizarGrupoBusRequest request, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task<bool> DesactivarAsync(
        long id, CancellationToken ct = default)
        => throw new NotImplementedException();

    private static GrupoBusDto Mapear(GruposBuse grupo) => new()
    {
        Id = grupo.Id,
        CooperativaId = grupo.CooperativaId,
        Nombre = grupo.Nombre,
        Descripcion = grupo.Descripcion,
        Activo = grupo.Activo
    };
}