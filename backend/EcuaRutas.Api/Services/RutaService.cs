using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Rutas;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Services;

public class RutaService : IRutaService
{
    private readonly EcuaRutasDbContext _context;

    public RutaService(EcuaRutasDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<RutaDto>> ListarAsync(CancellationToken ct = default)
    {
        var rutas = await _context.Rutas.AsNoTracking()
            .OrderBy(r => r.Nombre).ThenBy(r => r.Id).ToListAsync(ct);
        return rutas.Select(Mapear).ToList();
    }

    public async Task<RutaDto?> ObtenerAsync(long id, CancellationToken ct = default)
    {
        var ruta = await _context.Rutas.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, ct);
        return ruta is null ? null : Mapear(ruta);
    }

    public async Task<RutaDto> CrearAsync(CrearRutaDto request, CancellationToken ct = default)
    {
        Validator.ValidateObject(request, new ValidationContext(request), validateAllProperties: true);
        await using var transaction = await _context.Database.BeginTransactionAsync(ct);
        await ValidarLugaresAsync(request.OrigenLugarId, request.DestinoLugarId, true, ct);

        var ruta = new Ruta
        {
            Nombre = request.Nombre,
            OrigenLugarId = request.OrigenLugarId,
            DestinoLugarId = request.DestinoLugarId,
            TipoViaje = request.TipoViaje,
            Activa = true
        };
        _context.Rutas.Add(ruta);
        await _context.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Mapear(ruta);
    }

    public async Task<RutaDto?> ActualizarAsync(
        long id, ActualizarRutaDto request, CancellationToken ct = default)
    {
        Validator.ValidateObject(request, new ValidationContext(request), validateAllProperties: true);
        await using var transaction = await _context.Database.BeginTransactionAsync(ct);
        // Serializa cambios de la ruta y la confirmacion de nuevas referencias FK.
        // No impide lecturas previas sin bloqueo en otros modulos.
        var ruta = await _context.Rutas
            .FromSqlInterpolated($"SELECT * FROM rutas WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct);
        if (ruta is null)
            return null;

        // La consulta con tracking puede devolver una instancia cargada antes de adquirir el bloqueo.
        await _context.Entry(ruta).ReloadAsync(ct);

        var cambiaEstructura = ruta.OrigenLugarId != request.OrigenLugarId
            || ruta.DestinoLugarId != request.DestinoLugarId
            || ruta.TipoViaje != request.TipoViaje;
        if (cambiaEstructura)
        {
            // Las FK concurrentes esperan estos bloqueos; sus lecturas de negocio previas requieren cooperacion.
            await _context.RutaParadas
                .FromSqlInterpolated($"SELECT * FROM ruta_paradas WHERE ruta_id = {id} ORDER BY id FOR UPDATE")
                .AsNoTracking().ToListAsync(ct);

            var tieneFrecuencias = await _context.Frecuencias.AnyAsync(f => f.RutaId == id, ct);
            var tieneParadasReferenciadas = await _context.RutaParadas.AnyAsync(p => p.RutaId == id
                && (p.TarifasFrecuenciumOrigenRutaParada.Any() || p.TarifasFrecuenciumDestinoRutaParada.Any()
                    || p.VentaAsientoOrigenRutaParada.Any() || p.VentaAsientoDestinoRutaParada.Any()
                    || p.OcupacionesAsientoParadaAbordajes.Any() || p.OcupacionesAsientoParadaLiberacions.Any()
                    || p.ExtensionesBoletoDestinoAnteriors.Any() || p.ExtensionesBoletoDestinoNuevos.Any()), ct);
            if (tieneFrecuencias || tieneParadasReferenciadas)
                throw new ConflictoException("No se pueden cambiar el origen, destino o tipo de una ruta con referencias operativas.");
        }

        // Exige extremos activos al reactivar o cambiar extremos de una ruta activa.
        // Una edicion de metadatos puede conservar lugares desactivados posteriormente.
        var exigirActivos = request.Activa && (!ruta.Activa
            || ruta.OrigenLugarId != request.OrigenLugarId
            || ruta.DestinoLugarId != request.DestinoLugarId);
        await ValidarLugaresAsync(request.OrigenLugarId, request.DestinoLugarId, exigirActivos, ct);
        ruta.Nombre = request.Nombre;
        ruta.OrigenLugarId = request.OrigenLugarId;
        ruta.DestinoLugarId = request.DestinoLugarId;
        ruta.TipoViaje = request.TipoViaje;
        ruta.Activa = request.Activa;
        await _context.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Mapear(ruta);
    }

    public async Task<bool> DarDeBajaAsync(long id, CancellationToken ct = default)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(ct);
        var ruta = await _context.Rutas
            .FromSqlInterpolated($"SELECT * FROM rutas WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct);
        if (ruta is null)
            return false;

        // Refresca bajo el mismo bloqueo que ActualizarAsync para no perder una baja concurrente con reactivacion.
        await _context.Entry(ruta).ReloadAsync(ct);
        ruta.Activa = false;
        await _context.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return true;
    }

    private async Task ValidarLugaresAsync(long origenId, long destinoId, bool exigirActivos, CancellationToken ct)
    {
        // Orden estable y FOR SHARE protegen la comprobacion frente a bajas concurrentes.
        var lugares = await _context.Lugares
            .FromSqlInterpolated($"SELECT * FROM lugares WHERE id = {origenId} OR id = {destinoId} ORDER BY id FOR SHARE")
            .AsNoTracking().ToListAsync(ct);
        if (!lugares.Any(l => l.Id == origenId))
            throw new RecursoNoEncontradoException($"No existe el lugar de origen con id {origenId}.");
        if (!lugares.Any(l => l.Id == destinoId))
            throw new RecursoNoEncontradoException($"No existe el lugar de destino con id {destinoId}.");
        if (exigirActivos && lugares.Any(l => !l.Activo))
            throw new ConflictoException("El origen y el destino deben estar activos para habilitar la ruta.");
    }

    private static RutaDto Mapear(Ruta ruta) => new()
    {
        Id = ruta.Id,
        Nombre = ruta.Nombre,
        OrigenLugarId = ruta.OrigenLugarId,
        DestinoLugarId = ruta.DestinoLugarId,
        TipoViaje = ruta.TipoViaje,
        Activa = ruta.Activa
    };
}
