using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.OperacionBus;
using EcuaRutas.Api.DTOs.Viajes;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql; // Requerido para los Errores de PostgreSQL

namespace EcuaRutas.Api.Services;

public class OperacionBusService : IOperacionBusService
{
    private static readonly string[] EstadosVisibles =
        { EstadosViaje.Programado, EstadosViaje.Abierto, EstadosViaje.EnCurso };

    // Estados de boletos y ventas
    private const string BoletoActivo = "ACTIVO";
    private const string BoletoUsado = "USADO";
    private const string AsientoConfirmado = "CONFIRMADO";
    private const string ValidacionOk = "VALIDADO";
    private const string ValidacionRechazada = "RECHAZADO";

    private readonly EcuaRutasDbContext _db;

    public OperacionBusService(EcuaRutasDbContext db) => _db = db;

    public async Task<IReadOnlyList<ViajeAsignadoDto>> ListarViajesAsignadosAsync(
        long usuarioBusId, CancellationToken ct = default)
        => await _db.Viajes.AsNoTracking()
            .Where(v => v.UsuarioBusId == usuarioBusId && EstadosVisibles.Contains(v.Estado))
            .OrderBy(v => v.SalidaProgramada)
            .Select(v => new ViajeAsignadoDto(
                v.Id, v.Estado, v.SalidaProgramada, v.IniciadoEn,
                v.BusId, v.Bus.NumeroInterno, v.Bus.Placa, v.FrecuenciaId,
                v.Frecuencia.Ruta.OrigenLugar.Nombre, v.Frecuencia.Ruta.DestinoLugar.Nombre))
            .ToListAsync(ct);

    public async Task<ViajeDto> IniciarViajeAsync(long viajeId, long usuarioBusId, CancellationToken ct = default)
    {
        var viaje = await CargarViajeAsignadoAsync(viajeId, usuarioBusId, ct);
        if (viaje.Estado is not (EstadosViaje.Programado or EstadosViaje.Abierto))
            throw new ReglaNegocioException(409, $"No se puede iniciar un viaje en estado {viaje.Estado}.");
        if (await _db.Viajes.AnyAsync(v => v.BusId == viaje.BusId && v.Estado == EstadosViaje.EnCurso, ct))
            throw new ReglaNegocioException(409, "El bus ya tiene un viaje en curso.");

        viaje.Estado = EstadosViaje.EnCurso;
        viaje.IniciadoEn = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return ViajeService.Mapear(viaje);
    }

    public async Task<OcupacionAsientoDto> AbordarPasajeroAsync(
        long viajeId, long usuarioBusId, AbordarPasajeroDto dto, CancellationToken ct = default)
    {
        var viaje = await CargarViajeAsignadoAsync(viajeId, usuarioBusId, ct);
        ExigirEnCurso(viaje);

        var token = dto.QrToken.Trim();
        var boleto = await _db.Boletos.Include(b => b.VentaAsiento)
            .FirstOrDefaultAsync(b => b.QrToken == token, ct)
            ?? throw new ReglaNegocioException(404, "No existe un boleto con ese código QR.");

        var rechazo = MotivoRechazo(boleto, viajeId);
        if (rechazo is not null)
        {
            _db.ValidacionesBoletos.Add(NuevaValidacion(boleto.Id, viajeId, usuarioBusId, ValidacionRechazada, rechazo));
            await _db.SaveChangesAsync(ct);
            throw new ReglaNegocioException(409, rechazo);
        }

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        long ocupacionId;
        try
        {
            var ids = await _db.Database
                .SqlQuery<long>($"SELECT abordar_pasajero({boleto.VentaAsientoId}, {usuarioBusId}) AS \"Value\"")
                .ToListAsync(ct);
            ocupacionId = ids.Single();
        }
        catch (PostgresException ex) when (ex.SqlState is PostgresErrorCodes.RaiseException or PostgresErrorCodes.UniqueViolation)
        {
            throw new ReglaNegocioException(409, ex.MessageText);
        }

        boleto.Estado = BoletoUsado;
        _db.ValidacionesBoletos.Add(NuevaValidacion(boleto.Id, viajeId, usuarioBusId, ValidacionOk, null));
        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return await ObtenerOcupacionDtoAsync(ocupacionId, ct);
    }

    public async Task<OcupacionAsientoDto> MarcarNoPresentadoAsync(
        long viajeId, long usuarioBusId, MarcarNoPresentadoDto dto, CancellationToken ct = default)
    {
        var viaje = await CargarViajeAsignadoAsync(viajeId, usuarioBusId, ct);
        ExigirEnCurso(viaje);

        var venta = await _db.VentaAsientos.AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == dto.VentaAsientoId && v.ViajeId == viajeId, ct)
            ?? throw new ReglaNegocioException(404, "El asiento vendido no pertenece a este viaje.");
        if (venta.EstadoAsiento != AsientoConfirmado)
            throw new ReglaNegocioException(409, "Solo se marca como no presentado un asiento CONFIRMADO.");
        if (await _db.OcupacionesAsientos.AnyAsync(o => o.VentaAsientoId == venta.Id, ct))
            throw new ReglaNegocioException(409, "El asiento ya tiene un registro de ocupación.");

        var ocupacion = new OcupacionesAsiento
        {
            VentaAsientoId = venta.Id,
            ViajeId = viajeId,
            AsientoBusId = venta.AsientoBusId,
            PasajeroId = venta.PasajeroId,
            ParadaAbordajeId = venta.OrigenRutaParadaId,
            UsuarioBusAbordajeId = usuarioBusId,
            Estado = EstadosOcupacion.NoPresentado,
            Observacion = dto.Observacion
        };
        _db.OcupacionesAsientos.Add(ocupacion);
        await _db.SaveChangesAsync(ct);
        return MapearOcupacion(ocupacion);
    }

    public async Task<OcupacionAsientoDto> LiberarAsientoAsync(
        long viajeId, long ocupacionId, long usuarioBusId, LiberarAsientoDto dto, CancellationToken ct = default)
    {
        var viaje = await CargarViajeAsignadoAsync(viajeId, usuarioBusId, ct);
        ExigirEnCurso(viaje);

        var ocupacion = await _db.OcupacionesAsientos.AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == ocupacionId && o.ViajeId == viajeId, ct)
            ?? throw new ReglaNegocioException(404, "La ocupación no pertenece a este viaje.");
        if (ocupacion.Estado != EstadosOcupacion.Abordado)
            throw new ReglaNegocioException(409, "La ocupación ya no está abordada.");

        var rutaId = await ObtenerRutaIdAsync(viaje.FrecuenciaId, ct);
        if (!await _db.RutaParadas.AnyAsync(p => p.Id == dto.ParadaLiberacionId && p.RutaId == rutaId, ct))
            throw new ReglaNegocioException(400, "La parada de liberación no pertenece a la ruta del viaje.");

        try
        {
            await _db.Database.ExecuteSqlAsync(
                $"SELECT liberar_asiento({ocupacionId}, {usuarioBusId}, {dto.ParadaLiberacionId}, {dto.Observacion}::text)", ct);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.RaiseException)
        {
            throw new ReglaNegocioException(409, ex.MessageText);
        }

        return await ObtenerOcupacionDtoAsync(ocupacionId, ct);
    }

    // --- PRIVADOS ---
    private async Task<Viaje> CargarViajeAsignadoAsync(long viajeId, long usuarioBusId, CancellationToken ct)
    {
        var viaje = await _db.Viajes.FirstOrDefaultAsync(v => v.Id == viajeId, ct)
            ?? throw new ReglaNegocioException(404, "El viaje no existe.");
        if (viaje.UsuarioBusId != usuarioBusId)
            throw new ReglaNegocioException(403, "El viaje no está asignado a este usuario.");
        return viaje;
    }

    private static void ExigirEnCurso(Viaje viaje)
    {
        if (viaje.Estado != EstadosViaje.EnCurso)
            throw new ReglaNegocioException(409, "El viaje debe estar EN_CURSO.");
    }

    private static string? MotivoRechazo(Boleto b, long viajeId)
    {
        if (b.VentaAsiento.ViajeId != viajeId) return "El boleto no corresponde a este viaje.";
        if (b.Estado != BoletoActivo) return $"El boleto no está activo (estado: {b.Estado}).";
        if (b.VentaAsiento.EstadoAsiento != AsientoConfirmado) return "El asiento del boleto no está confirmado.";
        return null;
    }

    private static ValidacionesBoleto NuevaValidacion(
        long boletoId, long viajeId, long usuarioBusId, string resultado, string? observacion)
        => new()
        {
            BoletoId = boletoId,
            ViajeId = viajeId,
            UsuarioBusId = usuarioBusId,
            Resultado = resultado,
            Observacion = observacion
        };

    private async Task<long> ObtenerRutaIdAsync(long frecuenciaId, CancellationToken ct)
        => await _db.Frecuencias.AsNoTracking()
            .Where(f => f.Id == frecuenciaId).Select(f => f.RutaId).SingleAsync(ct);

    private static OcupacionAsientoDto MapearOcupacion(OcupacionesAsiento o) => new(
        o.Id, o.VentaAsientoId, o.ViajeId, o.AsientoBusId, o.PasajeroId, o.ParadaAbordajeId,
        o.ParadaLiberacionId, o.Estado, o.AbordadoEn, o.LiberadoEn, o.Observacion);

    private async Task<OcupacionAsientoDto> ObtenerOcupacionDtoAsync(long id, CancellationToken ct)
        => MapearOcupacion(await _db.OcupacionesAsientos.AsNoTracking().SingleAsync(o => o.Id == id, ct));
}