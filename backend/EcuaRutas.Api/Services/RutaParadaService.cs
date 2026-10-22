using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Rutas;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace EcuaRutas.Api.Services;

public class RutaParadaService : IRutaParadaService
{
    private readonly EcuaRutasDbContext _context;

    public RutaParadaService(EcuaRutasDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<RutaParadaDto>> ListarAsync(long rutaId, CancellationToken ct = default)
    {
        await ComprobarRutaAsync(rutaId, ct);
        var paradas = await _context.RutaParadas.AsNoTracking().Where(p => p.RutaId == rutaId)
            .OrderBy(p => p.Orden).ThenBy(p => p.Id).ToListAsync(ct);
        return paradas.Select(Mapear).ToList();
    }

    public async Task<RutaParadaDto?> ObtenerAsync(long rutaId, long id, CancellationToken ct = default)
    {
        await ComprobarRutaAsync(rutaId, ct);
        var parada = await _context.RutaParadas.AsNoTracking()
            .FirstOrDefaultAsync(p => p.RutaId == rutaId && p.Id == id, ct);
        return parada is null ? null : Mapear(parada);
    }

    public async Task<RutaParadaDto> CrearAsync(
        long rutaId, CrearRutaParadaDto request, CancellationToken ct = default)
    {
        Validator.ValidateObject(request, new ValidationContext(request), validateAllProperties: true);
        await using var transaction = await _context.Database.BeginTransactionAsync(ct);
        await BloquearRutaAsync(rutaId, ct);
        await ValidarLugarAsync(request.LugarId, true, ct);
        await ValidarDuplicadosAsync(rutaId, request.LugarId, request.Orden, null, ct);

        var parada = new RutaParada
        {
            RutaId = rutaId,
            LugarId = request.LugarId,
            Orden = request.Orden,
            KmAcumulado = request.KmAcumulado,
            MinutosAcumulados = request.MinutosAcumulados,
            PermiteAscenso = request.PermiteAscenso,
            PermiteDescenso = request.PermiteDescenso
        };
        _context.RutaParadas.Add(parada);
        await GuardarAsync(ct);
        await transaction.CommitAsync(ct);
        return Mapear(parada);
    }

    public async Task<RutaParadaDto?> ActualizarAsync(
        long rutaId, long id, ActualizarRutaParadaDto request, CancellationToken ct = default)
    {
        Validator.ValidateObject(request, new ValidationContext(request), validateAllProperties: true);
        await using var transaction = await _context.Database.BeginTransactionAsync(ct);
        await BloquearRutaAsync(rutaId, ct);
        var parada = await BloquearParadaAsync(rutaId, id, ct);
        if (parada is null)
            return null;

        await ComprobarSinReferenciasAsync(id, ct);
        // Conservar el mismo lugar inactivo no crea una nueva asociacion.
        await ValidarLugarAsync(request.LugarId, parada.LugarId != request.LugarId, ct);
        await ValidarDuplicadosAsync(rutaId, request.LugarId, request.Orden, id, ct);
        parada.LugarId = request.LugarId;
        parada.Orden = request.Orden;
        parada.KmAcumulado = request.KmAcumulado;
        parada.MinutosAcumulados = request.MinutosAcumulados;
        parada.PermiteAscenso = request.PermiteAscenso;
        parada.PermiteDescenso = request.PermiteDescenso;
        await GuardarAsync(ct);
        await transaction.CommitAsync(ct);
        return Mapear(parada);
    }

    public async Task<bool> EliminarAsync(long rutaId, long id, CancellationToken ct = default)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(ct);
        await BloquearRutaAsync(rutaId, ct);
        var parada = await BloquearParadaAsync(rutaId, id, ct);
        if (parada is null)
            return false;
        await ComprobarSinReferenciasAsync(id, ct);
        _context.RutaParadas.Remove(parada);
        await GuardarAsync(ct);
        await transaction.CommitAsync(ct);
        return true;
    }

    private async Task ComprobarRutaAsync(long rutaId, CancellationToken ct)
    {
        if (!await _context.Rutas.AsNoTracking().AnyAsync(r => r.Id == rutaId, ct))
            throw new RecursoNoEncontradoException($"No existe la ruta con id {rutaId}.");
    }

    private async Task BloquearRutaAsync(long rutaId, CancellationToken ct)
    {
        // Orden de bloqueo comun: ruta, parada, lugar. Serializa escrituras de paradas de la misma ruta.
        var ruta = await _context.Rutas
            .FromSqlInterpolated($"SELECT * FROM rutas WHERE id = {rutaId} FOR UPDATE")
            .AsNoTracking().SingleOrDefaultAsync(ct);
        if (ruta is null)
            throw new RecursoNoEncontradoException($"No existe la ruta con id {rutaId}.");
    }

    private async Task<RutaParada?> BloquearParadaAsync(long rutaId, long id, CancellationToken ct)
    {
        var parada = await _context.RutaParadas
            .FromSqlInterpolated($"SELECT * FROM ruta_paradas WHERE ruta_id = {rutaId} AND id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct);

        // El bloqueo SQL no actualiza por si solo una instancia previamente rastreada por EF.
        if (parada is not null)
            await _context.Entry(parada).ReloadAsync(ct);

        return parada;
    }

    private async Task ValidarLugarAsync(long lugarId, bool exigirActivo, CancellationToken ct)
    {
        var lugar = await _context.Lugares
            .FromSqlInterpolated($"SELECT * FROM lugares WHERE id = {lugarId} FOR SHARE")
            .AsNoTracking().SingleOrDefaultAsync(ct);
        if (lugar is null)
            throw new RecursoNoEncontradoException($"No existe el lugar con id {lugarId}.");
        if (exigirActivo && !lugar.Activo)
            throw new ConflictoException("No se puede asociar un lugar inactivo a una nueva parada.");
    }

    private async Task ValidarDuplicadosAsync(long rutaId, long lugarId, int orden, long? idActual, CancellationToken ct)
    {
        var paradas = _context.RutaParadas.AsNoTracking().Where(p => p.RutaId == rutaId && p.Id != idActual);
        if (await paradas.AnyAsync(p => p.LugarId == lugarId, ct))
            throw new ConflictoException("El lugar ya pertenece a las paradas de esta ruta.");
        if (await paradas.AnyAsync(p => p.Orden == orden, ct))
            throw new ConflictoException("El orden ya esta ocupado por otra parada de esta ruta.");
    }

    private async Task ComprobarSinReferenciasAsync(long id, CancellationToken ct)
    {
        var referenciada = await _context.RutaParadas.AsNoTracking().AnyAsync(p => p.Id == id
            && (p.TarifasFrecuenciumOrigenRutaParada.Any() || p.TarifasFrecuenciumDestinoRutaParada.Any()
                || p.VentaAsientoOrigenRutaParada.Any() || p.VentaAsientoDestinoRutaParada.Any()
                || p.OcupacionesAsientoParadaAbordajes.Any() || p.OcupacionesAsientoParadaLiberacions.Any()
                || p.ExtensionesBoletoDestinoAnteriors.Any() || p.ExtensionesBoletoDestinoNuevos.Any()), ct);
        if (referenciada)
            throw new ConflictoException("No se puede modificar o eliminar una parada referenciada por tarifas, ventas, ocupaciones o extensiones de boletos.");
    }

    private async Task GuardarAsync(CancellationToken ct)
    {
        try
        {
            await _context.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException
            {
                SqlState: PostgresErrorCodes.UniqueViolation,
                TableName: "ruta_paradas",
                ConstraintName: "ruta_paradas_ruta_id_lugar_id_key" or "ruta_paradas_ruta_id_orden_key"
            })
        {
            // Defensa frente a escritores que no utilizan el bloqueo del servicio.
            throw new ConflictoException("Otra operacion ya registro ese lugar u orden en la ruta.");
        }
    }

    private static RutaParadaDto Mapear(RutaParada parada) => new()
    {
        Id = parada.Id,
        RutaId = parada.RutaId,
        LugarId = parada.LugarId,
        Orden = parada.Orden,
        KmAcumulado = parada.KmAcumulado,
        MinutosAcumulados = parada.MinutosAcumulados,
        PermiteAscenso = parada.PermiteAscenso,
        PermiteDescenso = parada.PermiteDescenso
    };
}
