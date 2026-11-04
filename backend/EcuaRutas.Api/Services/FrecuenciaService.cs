using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Frecuencias;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace EcuaRutas.Api.Services;

/// <summary>
/// Gestiona frecuencias sin autorización HTTP ni cascadas. Creación, reactivación y
/// cambios estructurales de una frecuencia activa requieren referencias activas.
/// Las ediciones descriptivas conservan referencias desactivadas posteriormente.
/// Codigo se conserva literalmente y no es único. No modifica otros módulos.
/// </summary>
public class FrecuenciaService : IFrecuenciaService
{
    private readonly EcuaRutasDbContext _db;
    public FrecuenciaService(EcuaRutasDbContext db) => _db = db;

    private static readonly Expression<Func<Frecuencia, FrecuenciaDto>> Proyeccion = frecuencia => new FrecuenciaDto
    {
        Id = frecuencia.Id, CooperativaId = frecuencia.CooperativaId, RutaId = frecuencia.RutaId,
        ResolucionAntId = frecuencia.ResolucionAntId, Codigo = frecuencia.Codigo,
        HoraSalida = frecuencia.HoraSalida, Activa = frecuencia.Activa
    };

    public async Task<IReadOnlyList<FrecuenciaDto>> ListarAsync(
        long? cooperativaId = null, long? rutaId = null, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        if (cooperativaId.HasValue) ValidarId(cooperativaId.Value);
        if (rutaId.HasValue) ValidarId(rutaId.Value);
        var consulta = _db.Frecuencias.AsNoTracking();
        if (cooperativaId.HasValue) consulta = consulta.Where(f => f.CooperativaId == cooperativaId.Value);
        if (rutaId.HasValue) consulta = consulta.Where(f => f.RutaId == rutaId.Value);
        return await consulta.OrderBy(f => f.CooperativaId).ThenBy(f => f.RutaId)
            .ThenBy(f => f.HoraSalida).ThenBy(f => f.Id).Select(Proyeccion).ToListAsync(ct);
    }

    public async Task<FrecuenciaDto?> ObtenerAsync(long id, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        ValidarId(id);
        return await _db.Frecuencias.AsNoTracking().Where(f => f.Id == id).Select(Proyeccion).SingleOrDefaultAsync(ct);
    }

    public async Task<FrecuenciaDto> CrearAsync(CrearFrecuenciaDto request, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        ArgumentNullException.ThrowIfNull(request);
        Validator.ValidateObject(request, new ValidationContext(request), validateAllProperties: true);
        var frecuencia = new Frecuencia
        {
            CooperativaId = request.CooperativaId, RutaId = request.RutaId, ResolucionAntId = request.ResolucionAntId,
            Codigo = request.Codigo, HoraSalida = request.HoraSalida!.Value, Activa = true
        };
        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        await ValidarReferenciasAsync(frecuencia, exigirActivas: true, ct);
        await ComprobarDuplicadoAsync(frecuencia, null, ct);
        _db.Frecuencias.Add(frecuencia);
        await GuardarAsync(ct);
        await transaction.CommitAsync(ct);
        return Mapear(frecuencia);
    }

    public async Task<FrecuenciaDto?> ActualizarAsync(long id, ActualizarFrecuenciaDto request, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        ValidarId(id);
        ArgumentNullException.ThrowIfNull(request);
        Validator.ValidateObject(request, new ValidationContext(request), validateAllProperties: true);
        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        var actual = await BloquearAsync(id, ct);
        if (actual is null) return null;
        var propuesta = new Frecuencia
        {
            Id = id, CooperativaId = request.CooperativaId, RutaId = request.RutaId,
            ResolucionAntId = request.ResolucionAntId, HoraSalida = request.HoraSalida!.Value,
            Codigo = request.Codigo, Activa = request.Activa
        };
        var cambiaEstructura = FrecuenciaValidator.TieneCambiosEstructurales(actual, propuesta);
        if (cambiaEstructura && await _db.Frecuencias.AsNoTracking().AnyAsync(f => f.Id == id
            && (f.Viajes.Any() || f.HojaRutaDetalles.Any() || f.TarifasFrecuencia.Any()), ct))
            throw new ConflictoException("No se puede cambiar la estructura de una frecuencia referenciada por viajes, hojas de ruta o tarifas.");

        var exigirActivas = propuesta.Activa && (!actual.Activa || cambiaEstructura);
        await ValidarReferenciasAsync(propuesta, exigirActivas, ct);
        await ComprobarDuplicadoAsync(propuesta, id, ct);
        actual.CooperativaId = propuesta.CooperativaId;
        actual.RutaId = propuesta.RutaId;
        actual.ResolucionAntId = propuesta.ResolucionAntId;
        actual.HoraSalida = propuesta.HoraSalida;
        actual.Codigo = propuesta.Codigo;
        actual.Activa = propuesta.Activa;
        await GuardarAsync(ct);
        await transaction.CommitAsync(ct);
        return Mapear(actual);
    }

    public async Task<bool> DarDeBajaAsync(long id, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        ValidarId(id);
        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        var frecuencia = await BloquearAsync(id, ct);
        if (frecuencia is null) return false;
        frecuencia.Activa = false;
        await GuardarAsync(ct);
        await transaction.CommitAsync(ct);
        return true;
    }

    private async Task<Frecuencia?> BloquearAsync(long id, CancellationToken ct)
    {
        // Serializa ediciones/bajas y la comprobación de nuevas referencias FK.
        // Los consumidores operativos deben coordinar también sus lecturas de negocio.
        var frecuencia = await _db.Frecuencias
            .FromSqlInterpolated($"SELECT * FROM frecuencias WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct);
        if (frecuencia is not null) await _db.Entry(frecuencia).ReloadAsync(ct);
        return frecuencia;
    }

    private async Task ValidarReferenciasAsync(Frecuencia frecuencia, bool exigirActivas, CancellationToken ct)
    {
        // Orden de lectura: resolución, ruta, cooperativa. Los bloqueos compartidos
        // mantienen identidad/estado hasta el commit, también frente a ResolucionAntService.
        // Solo se proyectan los campos que necesita el validador; no se cargan navegaciones.
        var resolucionId = frecuencia.ResolucionAntId;
        var resolucion = await _db.ResolucionesAnts
            .FromSqlInterpolated($"SELECT * FROM resoluciones_ant WHERE id = {resolucionId} FOR SHARE")
            .AsNoTracking().Select(r => new ResolucionesAnt { Id = r.Id, CooperativaId = r.CooperativaId, Activa = r.Activa })
            .SingleOrDefaultAsync(ct)
            ?? throw new RecursoNoEncontradoException($"No existe la resolución ANT con id {resolucionId}.");
        var rutaId = frecuencia.RutaId;
        var ruta = await _db.Rutas.FromSqlInterpolated($"SELECT * FROM rutas WHERE id = {rutaId} FOR SHARE")
            .AsNoTracking().Select(r => new Ruta { Id = r.Id, Activa = r.Activa }).SingleOrDefaultAsync(ct)
            ?? throw new RecursoNoEncontradoException($"No existe la ruta con id {rutaId}.");
        var cooperativaId = frecuencia.CooperativaId;
        var cooperativa = await _db.Cooperativas
            .FromSqlInterpolated($"SELECT * FROM cooperativas WHERE id = {cooperativaId} FOR SHARE")
            .AsNoTracking().Select(c => new Cooperativa { Id = c.Id, Activa = c.Activa }).SingleOrDefaultAsync(ct)
            ?? throw new RecursoNoEncontradoException($"No existe la cooperativa con id {cooperativaId}.");
        var errores = exigirActivas
            ? FrecuenciaValidator.ValidarConReferenciasActivas(frecuencia, cooperativa, ruta, resolucion)
            : FrecuenciaValidator.Validar(frecuencia, cooperativa, ruta, resolucion);
        if (errores.Count > 0) throw new ConflictoException(string.Join(" ", errores));
    }

    private async Task ComprobarDuplicadoAsync(Frecuencia frecuencia, long? idActual, CancellationToken ct)
    {
        if (await _db.Frecuencias.AsNoTracking().AnyAsync(f => f.CooperativaId == frecuencia.CooperativaId
            && f.RutaId == frecuencia.RutaId && f.HoraSalida == frecuencia.HoraSalida
            && (!idActual.HasValue || f.Id != idActual.Value), ct))
            throw new ConflictoException("Ya existe una frecuencia para esa cooperativa, ruta y hora, aunque esté inactiva.");
    }

    private async Task GuardarAsync(CancellationToken ct)
    {
        try { await _db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            TableName: "frecuencias",
            ConstraintName: "frecuencias_cooperativa_id_ruta_id_hora_salida_key"
        })
        {
            throw new ConflictoException("Otra operación ya registró una frecuencia para esa cooperativa, ruta y hora.");
        }
    }

    private static void ValidarId(long id)
    {
        if (id <= 0) throw new ValidationException("El identificador debe ser positivo.");
    }

    private static FrecuenciaDto Mapear(Frecuencia frecuencia) => new()
    {
        Id = frecuencia.Id, CooperativaId = frecuencia.CooperativaId, RutaId = frecuencia.RutaId,
        ResolucionAntId = frecuencia.ResolucionAntId, Codigo = frecuencia.Codigo,
        HoraSalida = frecuencia.HoraSalida, Activa = frecuencia.Activa
    };
}
