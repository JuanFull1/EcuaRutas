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

    public async Task<PlantillaBusDto> CrearAsync(CrearPlantillaBusRequest request, CancellationToken ct = default)
    {
        var plantilla = new PlantillasBu
        {
            CooperativaId = request.CooperativaId,
            Nombre = request.Nombre.Trim(),
            Pisos = (short)request.Pisos,
            TieneBanio = request.TieneBanio,
            Activa = true
        };

        _db.PlantillasBus.Add(plantilla);
        await _db.SaveChangesAsync(ct);

        return MapearPlantilla(plantilla);
    }

    public async Task<IReadOnlyList<PlantillaAsientoDto>?> ObtenerDisposicionAsync(long plantillaId, CancellationToken ct = default)
    {
        var existe = await _db.PlantillasBus.AnyAsync(p => p.Id == plantillaId, ct);
        if (!existe) return null;

        var asientos = await _db.PlantillaAsientos.AsNoTracking()
            .Where(a => a.PlantillaId == plantillaId)
            .OrderBy(a => a.Piso).ThenBy(a => a.Fila).ThenBy(a => a.Columna)
            .ToListAsync(ct);

        return asientos.Select(MapearAsiento).ToList();
    }

    public async Task<IReadOnlyList<PlantillaAsientoDto>?> DefinirDisposicionAsync(long plantillaId, IReadOnlyList<CrearAsientoPlantillaRequest> asientos, CancellationToken ct = default)
    {
        var plantilla = await _db.PlantillasBus.FirstOrDefaultAsync(p => p.Id == plantillaId, ct);
        if (plantilla is null) return null;

        var errores = DisposicionPlantillaValidator.Validar(plantilla.Pisos, asientos);
        if (errores.Count > 0)
            throw new ArgumentException(string.Join(" ", errores));

        var anteriores = await _db.PlantillaAsientos
            .Where(a => a.PlantillaId == plantillaId)
            .ToListAsync(ct);
        _db.PlantillaAsientos.RemoveRange(anteriores);

        var nuevos = asientos.Select(a => new PlantillaAsiento
        {
            PlantillaId = plantillaId,
            TipoAsientoId = a.TipoAsientoId,
            Numero = a.Numero.Trim(),
            Piso = (short)a.Piso,
            Fila = (short?)a.Fila,
            Columna = (short?)a.Columna,
            Activo = true
        }).ToList();

        _db.PlantillaAsientos.AddRange(nuevos);
        await _db.SaveChangesAsync(ct);

        return nuevos.Select(MapearAsiento).ToList();
    }

    private static PlantillaAsientoDto MapearAsiento(PlantillaAsiento a) => new()
    {
        Id = a.Id,
        PlantillaId = a.PlantillaId,
        TipoAsientoId = a.TipoAsientoId,
        Numero = a.Numero,
        Piso = a.Piso,
        Fila = a.Fila,
        Columna = a.Columna,
        Activo = a.Activo
    };

    public async Task<bool> AsignarABusAsync(long busId, long plantillaId, CancellationToken ct = default)
    {
        var bus = await _db.Buses.FirstOrDefaultAsync(b => b.Id == busId, ct);
        if (bus is null) return false;

        var existePlantilla = await _db.PlantillasBus.AnyAsync(p => p.Id == plantillaId, ct);
        if (!existePlantilla) return false;

        var plantillaAsientos = await _db.PlantillaAsientos.AsNoTracking()
            .Where(a => a.PlantillaId == plantillaId)
            .ToListAsync(ct);

        var anteriores = await _db.AsientosBus
            .Where(a => a.BusId == busId)
            .ToListAsync(ct);
        _db.AsientosBus.RemoveRange(anteriores);

        var copias = plantillaAsientos.Select(a => new AsientosBu
        {
            BusId = busId,
            TipoAsientoId = a.TipoAsientoId,
            Numero = a.Numero,
            Piso = a.Piso,
            Fila = a.Fila,
            Columna = a.Columna,
            Activo = a.Activo
        });
        _db.AsientosBus.AddRange(copias);

        bus.PlantillaId = plantillaId;
        await _db.SaveChangesAsync(ct);

        return true;
    }

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
