using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.ResolucionesAnt;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace EcuaRutas.Api.Services;

/// <summary>
/// Gestiona resoluciones sin autorización HTTP ni cascadas de actividad. Exige que
/// la cooperativa exista; no introduce una política nueva sobre su estado.
/// Conserva el número literalmente, según la clave única SQL, sin cambiar espacios o mayúsculas.
/// </summary>
public class ResolucionAntService : IResolucionAntService
{
    private readonly EcuaRutasDbContext _db;
    public ResolucionAntService(EcuaRutasDbContext db) => _db = db;

    private static readonly Expression<Func<ResolucionesAnt, ResolucionAntDto>> Proyeccion = resolucion => new ResolucionAntDto
    {
        Id = resolucion.Id, CooperativaId = resolucion.CooperativaId,
        NumeroResolucion = resolucion.NumeroResolucion, FechaResolucion = resolucion.FechaResolucion,
        ArchivoUrl = resolucion.ArchivoUrl, Activa = resolucion.Activa
    };

    public async Task<IReadOnlyList<ResolucionAntDto>> ListarAsync(CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        return await _db.ResolucionesAnts.AsNoTracking()
            .OrderBy(r => r.NumeroResolucion).ThenBy(r => r.Id).Select(Proyeccion).ToListAsync(ct);
    }

    public async Task<ResolucionAntDto?> ObtenerAsync(long id, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        ValidarId(id);
        return await _db.ResolucionesAnts.AsNoTracking().Where(r => r.Id == id).Select(Proyeccion).SingleOrDefaultAsync(ct);
    }

    public async Task<ResolucionAntDto> CrearAsync(CrearResolucionAntDto request, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        ArgumentNullException.ThrowIfNull(request);
        Validator.ValidateObject(request, new ValidationContext(request), validateAllProperties: true);
        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        await ComprobarCooperativaAsync(request.CooperativaId, ct);
        await ComprobarDuplicadoAsync(request.CooperativaId, request.NumeroResolucion, null, ct);
        var resolucion = new ResolucionesAnt
        {
            CooperativaId = request.CooperativaId, NumeroResolucion = request.NumeroResolucion,
            FechaResolucion = request.FechaResolucion, ArchivoUrl = request.ArchivoUrl, Activa = true
        };
        _db.ResolucionesAnts.Add(resolucion);
        await GuardarAsync(ct);
        await transaction.CommitAsync(ct);
        return Mapear(resolucion);
    }

    public async Task<ResolucionAntDto?> ActualizarAsync(long id, ActualizarResolucionAntDto request, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        ValidarId(id);
        ArgumentNullException.ThrowIfNull(request);
        Validator.ValidateObject(request, new ValidationContext(request), validateAllProperties: true);
        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        var resolucion = await BloquearAsync(id, ct);
        if (resolucion is null) return null;

        // FOR UPDATE protege la comprobación frente a nuevas FK de frecuencias.
        // Sus futuros servicios deben coordinar también sus lecturas previas de negocio.
        if (resolucion.CooperativaId != request.CooperativaId
            && await _db.Frecuencias.AsNoTracking().AnyAsync(f => f.ResolucionAntId == id, ct))
            throw new ConflictoException("No se puede cambiar la cooperativa de una resolución referenciada por frecuencias.");

        await ComprobarCooperativaAsync(request.CooperativaId, ct);
        await ComprobarDuplicadoAsync(request.CooperativaId, request.NumeroResolucion, id, ct);
        resolucion.CooperativaId = request.CooperativaId;
        resolucion.NumeroResolucion = request.NumeroResolucion;
        resolucion.FechaResolucion = request.FechaResolucion;
        resolucion.ArchivoUrl = request.ArchivoUrl;
        resolucion.Activa = request.Activa;
        await GuardarAsync(ct);
        await transaction.CommitAsync(ct);
        return Mapear(resolucion);
    }

    public async Task<bool> DarDeBajaAsync(long id, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        ValidarId(id);
        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        var resolucion = await BloquearAsync(id, ct);
        if (resolucion is null) return false;
        // Es idempotente y no desactiva frecuencias ni altera relaciones históricas.
        resolucion.Activa = false;
        await GuardarAsync(ct);
        await transaction.CommitAsync(ct);
        return true;
    }

    private async Task<ResolucionesAnt?> BloquearAsync(long id, CancellationToken ct)
    {
        var resolucion = await _db.ResolucionesAnts
            .FromSqlInterpolated($"SELECT * FROM resoluciones_ant WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct);
        // EF puede devolver una instancia ya rastreada; se refresca después del bloqueo.
        if (resolucion is not null) await _db.Entry(resolucion).ReloadAsync(ct);
        return resolucion;
    }

    private async Task ComprobarCooperativaAsync(long cooperativaId, CancellationToken ct)
    {
        var id = await _db.Cooperativas
            .FromSqlInterpolated($"SELECT * FROM cooperativas WHERE id = {cooperativaId} FOR SHARE")
            .AsNoTracking().Select(c => c.Id).SingleOrDefaultAsync(ct);
        if (id == 0) throw new RecursoNoEncontradoException($"No existe la cooperativa con id {cooperativaId}.");
    }

    private async Task ComprobarDuplicadoAsync(long cooperativaId, string numero, long? idActual, CancellationToken ct)
    {
        if (await _db.ResolucionesAnts.AsNoTracking().AnyAsync(r => r.CooperativaId == cooperativaId
            && r.NumeroResolucion == numero && (!idActual.HasValue || r.Id != idActual.Value), ct))
            throw new ConflictoException("Ya existe una resolución con ese número para la cooperativa, aunque esté inactiva.");
    }

    private async Task GuardarAsync(CancellationToken ct)
    {
        try { await _db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            TableName: "resoluciones_ant",
            ConstraintName: "resoluciones_ant_cooperativa_id_numero_resolucion_key"
        })
        {
            throw new ConflictoException("Otra operación ya registró ese número de resolución para la cooperativa.");
        }
    }

    private static void ValidarId(long id)
    {
        if (id <= 0) throw new ValidationException("El identificador de resolución debe ser positivo.");
    }

    private static ResolucionAntDto Mapear(ResolucionesAnt resolucion) => new()
    {
        Id = resolucion.Id, CooperativaId = resolucion.CooperativaId, NumeroResolucion = resolucion.NumeroResolucion,
        FechaResolucion = resolucion.FechaResolucion, ArchivoUrl = resolucion.ArchivoUrl, Activa = resolucion.Activa
    };
}
