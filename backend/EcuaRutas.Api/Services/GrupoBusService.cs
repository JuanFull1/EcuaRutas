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

        public async Task<GrupoBusDto> CrearAsync(
        CrearGrupoBusRequest request, CancellationToken ct = default)
    {
                var existeCooperativa = await _db.Cooperativas
            .AnyAsync(c => c.Id == request.CooperativaId, ct);

        if (!existeCooperativa)
        {
            throw new RecursoNoEncontradoException(
                $"No existe la cooperativa con id {request.CooperativaId}.");
        }
                var nombre = request.Nombre.Trim();

        var nombreRepetido = await _db.GruposBuses.AnyAsync(
            g => g.CooperativaId == request.CooperativaId && g.Nombre == nombre, ct);

        if (nombreRepetido)
        {
            throw new ConflictoException(
                $"Ya existe un grupo llamado '{nombre}' en esta cooperativa.");
        }
        var grupo = new GruposBuse
        {
            CooperativaId = request.CooperativaId,
            Nombre = nombre,
            Descripcion = request.Descripcion,
            Activo = true
        };

        _db.GruposBuses.Add(grupo);
        await _db.SaveChangesAsync(ct);

        return Mapear(grupo);
    }

        public async Task<GrupoBusDto?> ActualizarAsync(
        long id, ActualizarGrupoBusRequest request, CancellationToken ct = default)
    {
        var grupo = await _db.GruposBuses
            .FirstOrDefaultAsync(g => g.Id == id, ct);

        if (grupo is null)
        {
            return null;
        }

                var nombre = request.Nombre.Trim();

        var nombreRepetido = await _db.GruposBuses.AnyAsync(
            g => g.CooperativaId == grupo.CooperativaId
                 && g.Id != id
                 && g.Nombre == nombre, ct);

        if (nombreRepetido)
        {
            throw new ConflictoException(
                $"Ya existe un grupo llamado '{nombre}' en esta cooperativa.");
        }

        grupo.Nombre = nombre;
        grupo.Descripcion = request.Descripcion;
        grupo.Activo = request.Activo;

        await _db.SaveChangesAsync(ct);

        return Mapear(grupo);
    }
        public async Task<bool> DesactivarAsync(
        long id, CancellationToken ct = default)
    {
        var grupo = await _db.GruposBuses
            .FirstOrDefaultAsync(g => g.Id == id, ct);

        if (grupo is null)
        {
            return false;
        }

        grupo.Activo = false;
        await _db.SaveChangesAsync(ct);

        return true;
    }
    private static GrupoBusDto Mapear(GruposBuse grupo) => new()
    {
        Id = grupo.Id,
        CooperativaId = grupo.CooperativaId,
        Nombre = grupo.Nombre,
        Descripcion = grupo.Descripcion,
        Activo = grupo.Activo
    };
}