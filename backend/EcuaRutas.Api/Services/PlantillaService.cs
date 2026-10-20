using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Services;

public class PlantillaService : IPlantillaService
{
    private readonly EcuaRutasDbContext _db;

    public PlantillaService(EcuaRutasDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<TipoAsientoDto>> ListarTiposAsientoAsync(long? cooperativaId = null, CancellationToken ct = default)
    {
        var consulta = _db.TiposAsientos.AsNoTracking().Where(t => t.Activo);

        // Con cooperativa: sus tipos propios más los generales (cooperativa_id nulo)
        if (cooperativaId.HasValue)
            consulta = consulta.Where(t => t.CooperativaId == cooperativaId || t.CooperativaId == null);

        var tipos = await consulta.OrderBy(t => t.Nombre).ToListAsync(ct);
        return tipos.Select(MapearTipo).ToList();
    }

    public async Task<IReadOnlyList<PlantillaBusDto>> ListarAsync(long? cooperativaId = null, CancellationToken ct = default)
    {
        var consulta = _db.PlantillasBus.AsNoTracking().Where(p => p.Activa);

        if (cooperativaId.HasValue)
            consulta = consulta.Where(p => p.CooperativaId == cooperativaId || p.CooperativaId == null);

        var plantillas = await consulta.OrderBy(p => p.Nombre).ToListAsync(ct);
        return plantillas.Select(MapearPlantilla).ToList();
    }

    public async Task<PlantillaBusDto?> ObtenerAsync(long id, CancellationToken ct = default)
    {
        var plantilla = await _db.PlantillasBus.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        return plantilla is null ? null : MapearPlantilla(plantilla);
    }

    public Task<PlantillaBusDto> CrearAsync(CrearPlantillaBusRequest request, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task<IReadOnlyList<PlantillaAsientoDto>?> ObtenerDisposicionAsync(long plantillaId, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task<IReadOnlyList<PlantillaAsientoDto>?> DefinirDisposicionAsync(long plantillaId, IReadOnlyList<CrearAsientoPlantillaRequest> asientos, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task<bool> AsignarABusAsync(long busId, long plantillaId, CancellationToken ct = default)
        => throw new NotImplementedException();

    private static TipoAsientoDto MapearTipo(TiposAsiento t) => new()
    {
        Id = t.Id,
        CooperativaId = t.CooperativaId,
        Nombre = t.Nombre,
        RecargoPorcentaje = t.RecargoPorcentaje,
        Activo = t.Activo
    };

    private static PlantillaBusDto MapearPlantilla(PlantillasBu p) => new()
    {
        Id = p.Id,
        CooperativaId = p.CooperativaId,
        Nombre = p.Nombre,
        Pisos = p.Pisos,
        TieneBanio = p.TieneBanio,
        Activa = p.Activa
    };
}
