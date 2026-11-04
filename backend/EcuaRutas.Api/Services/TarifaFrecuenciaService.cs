using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Tarifas;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace EcuaRutas.Api.Services;

/// <summary>
/// Administra tarifas, incluidas las inactivas, sin cambiar su frecuencia.
/// VentaAsiento conserva precio, importes y tramo propios; Boleto referencia esa
/// venta, no la tarifa. No hay FK histórica hacia tarifas en el modelo/SQL actual.
/// Cambiar precio o extremos solo afecta consultas futuras: nunca se recalculan
/// ventas, boletos ni compras. No se impone un bloqueo histórico artificial.
/// Los consumidores de ventas actuales no coordinan sus lecturas con estos bloqueos.
/// </summary>
public class TarifaFrecuenciaService(EcuaRutasDbContext db) : ITarifaFrecuenciaService
{
    private static readonly Expression<Func<TarifasFrecuencium, TarifaFrecuenciaDto>> Proyeccion = t => new()
    {
        Id = t.Id, FrecuenciaId = t.FrecuenciaId, OrigenRutaParadaId = t.OrigenRutaParadaId,
        DestinoRutaParadaId = t.DestinoRutaParadaId, PrecioBase = t.PrecioBase, Activa = t.Activa
    };

    public async Task<IReadOnlyList<TarifaFrecuenciaDto>> ListarAsync(CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        return await Consultar().ToListAsync(ct);
    }

    public async Task<TarifaFrecuenciaDto?> ObtenerAsync(long id, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        ValidarId(id);
        return await db.TarifasFrecuencia.AsNoTracking().Where(t => t.Id == id)
            .Select(Proyeccion).SingleOrDefaultAsync(ct);
    }

    public async Task<IReadOnlyList<TarifaFrecuenciaDto>> ListarPorFrecuenciaAsync(long frecuenciaId, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        ValidarId(frecuenciaId);
        if (!await db.Frecuencias.AsNoTracking().AnyAsync(f => f.Id == frecuenciaId, ct))
            throw new RecursoNoEncontradoException($"No existe la frecuencia con id {frecuenciaId}.");
        return await Consultar().Where(t => t.FrecuenciaId == frecuenciaId).ToListAsync(ct);
    }

    private IQueryable<TarifaFrecuenciaDto> Consultar() => db.TarifasFrecuencia.AsNoTracking()
        .OrderBy(t => t.FrecuenciaId).ThenBy(t => t.OrigenRutaParadaId)
        .ThenBy(t => t.DestinoRutaParadaId).ThenBy(t => t.Id).Select(Proyeccion);

    public async Task<TarifaFrecuenciaDto> CrearAsync(long frecuenciaId, CrearTarifaFrecuenciaDto request, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        ValidarId(frecuenciaId);
        ArgumentNullException.ThrowIfNull(request);
        Validator.ValidateObject(request, new ValidationContext(request), true);
        var tarifa = new TarifasFrecuencium
        {
            FrecuenciaId = frecuenciaId, OrigenRutaParadaId = request.OrigenRutaParadaId,
            DestinoRutaParadaId = request.DestinoRutaParadaId, PrecioBase = request.PrecioBase!.Value, Activa = true
        };
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await ValidarReferenciasAsync(tarifa, exigirActiva: true, ct);
        await ComprobarDuplicadoAsync(tarifa, ct);
        db.TarifasFrecuencia.Add(tarifa);
        await GuardarAsync(ct);
        await transaction.CommitAsync(ct);
        return Mapear(tarifa);
    }

    public async Task<TarifaFrecuenciaDto?> ActualizarAsync(long id, ActualizarTarifaFrecuenciaDto request, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        ValidarId(id);
        ArgumentNullException.ThrowIfNull(request);
        Validator.ValidateObject(request, new ValidationContext(request), true);
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var actual = await BloquearAsync(id, ct);
        if (actual is null) return null;
        var propuesta = new TarifasFrecuencium
        {
            Id = id, FrecuenciaId = actual.FrecuenciaId, OrigenRutaParadaId = request.OrigenRutaParadaId,
            DestinoRutaParadaId = request.DestinoRutaParadaId, PrecioBase = request.PrecioBase!.Value, Activa = request.Activa
        };
        var cambiaTramo = actual.OrigenRutaParadaId != propuesta.OrigenRutaParadaId
            || actual.DestinoRutaParadaId != propuesta.DestinoRutaParadaId;
        // Una baja o edición de una tarifa histórica sigue siendo posible si su
        // frecuencia se desactivó; alta, reactivación y cambios operativos exigen actividad.
        var exigirActiva = propuesta.Activa && (!actual.Activa || cambiaTramo || actual.PrecioBase != propuesta.PrecioBase);
        await ValidarReferenciasAsync(propuesta, exigirActiva, ct);
        await ComprobarDuplicadoAsync(propuesta, ct);
        actual.OrigenRutaParadaId = propuesta.OrigenRutaParadaId;
        actual.DestinoRutaParadaId = propuesta.DestinoRutaParadaId;
        actual.PrecioBase = propuesta.PrecioBase;
        actual.Activa = propuesta.Activa;
        await GuardarAsync(ct);
        await transaction.CommitAsync(ct);
        return Mapear(actual);
    }

    public async Task<bool> DarDeBajaAsync(long id, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        ValidarId(id);
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var actual = await BloquearAsync(id, ct);
        if (actual is null) return false;
        actual.Activa = false;
        await GuardarAsync(ct);
        await transaction.CommitAsync(ct);
        return true;
    }

    private async Task<TarifasFrecuencium?> BloquearAsync(long id, CancellationToken ct)
    {
        var tarifa = await db.TarifasFrecuencia
            .FromSqlInterpolated($"SELECT * FROM tarifas_frecuencia WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct);
        if (tarifa is not null) await db.Entry(tarifa).ReloadAsync(ct);
        return tarifa;
    }

    private async Task ValidarReferenciasAsync(TarifasFrecuencium tarifa, bool exigirActiva, CancellationToken ct)
    {
        var frecuenciaId = tarifa.FrecuenciaId;
        var frecuencia = await db.Frecuencias
            .FromSqlInterpolated($"SELECT * FROM frecuencias WHERE id = {frecuenciaId} FOR SHARE")
            .AsNoTracking().Select(f => new Frecuencia { Id = f.Id, RutaId = f.RutaId, Activa = f.Activa })
            .SingleOrDefaultAsync(ct)
            ?? throw new RecursoNoEncontradoException($"No existe la frecuencia con id {frecuenciaId}.");
        // Orden estable de bloqueos compartidos: conserva pertenencia y Orden
        // hasta commit frente a UPDATE/DELETE de las paradas en PostgreSQL.
        var menor = Math.Min(tarifa.OrigenRutaParadaId, tarifa.DestinoRutaParadaId);
        var mayor = Math.Max(tarifa.OrigenRutaParadaId, tarifa.DestinoRutaParadaId);
        var primera = await ParadaAsync(menor, ct);
        var segunda = await ParadaAsync(mayor, ct);
        var origen = tarifa.OrigenRutaParadaId == menor ? primera : segunda;
        var destino = tarifa.DestinoRutaParadaId == mayor ? segunda : primera;
        if (origen is null) throw new RecursoNoEncontradoException($"No existe la parada de origen con id {tarifa.OrigenRutaParadaId}.");
        if (destino is null) throw new RecursoNoEncontradoException($"No existe la parada de destino con id {tarifa.DestinoRutaParadaId}.");
        var errores = exigirActiva
            ? TarifaFrecuenciaValidator.ValidarConFrecuenciaActiva(tarifa, frecuencia, origen, destino)
            : TarifaFrecuenciaValidator.Validar(tarifa, frecuencia, origen, destino);
        if (errores.Count > 0) throw new ConflictoException(string.Join(" ", errores));
    }

    private Task<RutaParada?> ParadaAsync(long id, CancellationToken ct) => db.RutaParadas
        .FromSqlInterpolated($"SELECT * FROM ruta_paradas WHERE id = {id} FOR SHARE").AsNoTracking()
        .Select(p => new RutaParada { Id = p.Id, RutaId = p.RutaId, Orden = p.Orden }).SingleOrDefaultAsync(ct);

    private async Task ComprobarDuplicadoAsync(TarifasFrecuencium tarifa, CancellationToken ct)
    {
        if (await db.TarifasFrecuencia.AsNoTracking().AnyAsync(t => t.FrecuenciaId == tarifa.FrecuenciaId
            && t.OrigenRutaParadaId == tarifa.OrigenRutaParadaId && t.DestinoRutaParadaId == tarifa.DestinoRutaParadaId
            && t.Id != tarifa.Id, ct))
            throw new ConflictoException("Ya existe una tarifa para esa frecuencia y tramo, aunque esté inactiva.");
    }

    private async Task GuardarAsync(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation, TableName: "tarifas_frecuencia",
            ConstraintName: "tarifas_frecuencia_frecuencia_id_origen_ruta_parada_id_dest_key"
        })
        {
            throw new ConflictoException("Otra operación ya registró una tarifa para esa frecuencia y tramo.");
        }
    }

    private static void ValidarId(long id)
    {
        if (id <= 0) throw new ValidationException("El identificador debe ser positivo.");
    }

    private static TarifaFrecuenciaDto Mapear(TarifasFrecuencium t) => new()
    {
        Id = t.Id, FrecuenciaId = t.FrecuenciaId, OrigenRutaParadaId = t.OrigenRutaParadaId,
        DestinoRutaParadaId = t.DestinoRutaParadaId, PrecioBase = t.PrecioBase, Activa = t.Activa
    };
}
