using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Viajes;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace EcuaRutas.Api.Services;

public class ViajeService : IViajeService
{
    private readonly EcuaRutasDbContext _db;

    public ViajeService(EcuaRutasDbContext db) => _db = db;

        public async Task<ViajeDto> CrearAsync(CrearViajeDto dto, long? cooperativaContexto, CancellationToken ct = default)
    {
        if (dto.SalidaProgramada is null || dto.SalidaProgramada.Value == default)
            throw new ReglaNegocioException(400, "La salida programada no es válida.");
        var salida = AUtc(dto.SalidaProgramada.Value);
        if (salida <= DateTime.UtcNow)
            throw new ReglaNegocioException(400, "La salida programada debe ser futura.");

        var bus = await _db.Buses.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == dto.BusId
                && (cooperativaContexto == null || b.CooperativaId == cooperativaContexto), ct)
            ?? throw new ReglaNegocioException(404, "El bus no existe en la cooperativa.");
        if (bus.Estado != EstadosBus.Activo)
            throw new ReglaNegocioException(400, "El bus no está ACTIVO.");

        var frecuenciaValida = await _db.Frecuencias.AsNoTracking()
            .AnyAsync(f => f.Id == dto.FrecuenciaId && f.CooperativaId == bus.CooperativaId && f.Activa == true, ct);
        if (!frecuenciaValida)
            throw new ReglaNegocioException(400, "La frecuencia no existe, está inactiva o es de otra cooperativa.");

        if (dto.HojaRutaDetalleId is long detalleId)
            await ValidarDetalleAsync(detalleId, bus, dto.FrecuenciaId, ct);
        if (dto.UsuarioBusId is long usuarioId)
            await ValidarUsuarioBusAsync(usuarioId, bus.CooperativaId, ct);

        if (await _db.Viajes.AnyAsync(v => v.BusId == bus.Id
                && v.SalidaProgramada == salida && v.Estado != EstadosViaje.Cancelado, ct))
            throw new ReglaNegocioException(409, "El bus ya tiene un viaje programado a esa hora.");

        var viaje = new Viaje
        {
            HojaRutaDetalleId = dto.HojaRutaDetalleId,
            BusId = bus.Id,
            FrecuenciaId = dto.FrecuenciaId,
            UsuarioBusId = dto.UsuarioBusId,
            SalidaProgramada = salida,
            Estado = EstadosViaje.Programado
        };
        _db.Viajes.Add(viaje);
        await GuardarCambiosAsync(ct);
        return Mapear(viaje);
    }

    public async Task<ViajeDto> ObtenerPorIdAsync(long id, long? cooperativaContexto, CancellationToken ct = default)
    {
        var viaje = await _db.Viajes.AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == id
                && (cooperativaContexto == null || v.Bus.CooperativaId == cooperativaContexto), ct)
            ?? throw new ReglaNegocioException(404, "El viaje no existe.");
        return Mapear(viaje);
    }

    public async Task<IReadOnlyList<ViajeDto>> ListarAsync(
        long? cooperativaContexto, DateOnly? desde, DateOnly? hasta, string? estado, long? busId,
        CancellationToken ct = default)
    {
        if (desde is not null && hasta is not null && hasta.Value < desde.Value)
            throw new ReglaNegocioException(400, "El rango de fechas no es válido.");
        if (estado is not null && !EstadosValidos.Contains(estado))
            throw new ReglaNegocioException(400, "El estado indicado no es válido.");

        var q = _db.Viajes.AsNoTracking()
            .Where(v => cooperativaContexto == null || v.Bus.CooperativaId == cooperativaContexto);
        if (desde is not null)
            q = q.Where(v => v.SalidaProgramada >= desde.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
        if (hasta is not null)
            q = q.Where(v => v.SalidaProgramada < hasta.Value.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
        if (estado is not null) q = q.Where(v => v.Estado == estado);
        if (busId is not null) q = q.Where(v => v.BusId == busId);

        var viajes = await q.OrderBy(v => v.SalidaProgramada).ToListAsync(ct);
        return viajes.Select(Mapear).ToList();
    }

    private const string RolBus = "BUS";

    private static readonly string[] EstadosValidos =
    {
        EstadosViaje.Programado, EstadosViaje.Abierto, EstadosViaje.EnCurso,
        EstadosViaje.Finalizado, EstadosViaje.Cancelado
    };

    internal static ViajeDto Mapear(Viaje v) => new(
        v.Id, v.HojaRutaDetalleId, v.BusId, v.FrecuenciaId, v.UsuarioBusId,
        v.SalidaProgramada, v.IniciadoEn, v.FinalizadoEn, v.Estado);

    private static DateTime AUtc(DateTime d) => d.Kind switch
    {
        DateTimeKind.Local => d.ToUniversalTime(),
        DateTimeKind.Unspecified => DateTime.SpecifyKind(d, DateTimeKind.Utc),
        _ => d
    };

    private async Task ValidarDetalleAsync(long detalleId, Bus bus, long frecuenciaId, CancellationToken ct)
    {
        var detalle = await _db.HojaRutaDetalles.AsNoTracking()
            .Include(d => d.HojaRuta)
            .FirstOrDefaultAsync(d => d.Id == detalleId, ct)
            ?? throw new ReglaNegocioException(404, "El detalle de hoja de ruta no existe.");

        if (detalle.HojaRuta.CooperativaId != bus.CooperativaId)
            throw new ReglaNegocioException(404, "El detalle de hoja de ruta no existe en la cooperativa.");
        if (detalle.TipoAsignacion != TiposAsignacion.Servicio
            || detalle.BusId != bus.Id || detalle.FrecuenciaId != frecuenciaId)
            throw new ReglaNegocioException(400, "El detalle no coincide con el bus y la frecuencia indicados.");
        if (await _db.Viajes.AnyAsync(v => v.HojaRutaDetalleId == detalleId, ct))
            throw new ReglaNegocioException(409, "Ya existe un viaje para ese detalle de hoja de ruta.");
    }

    private async Task ValidarUsuarioBusAsync(long usuarioId, long cooperativaId, CancellationToken ct)
    {
        var valido = await _db.Usuarios.AsNoTracking()
            .AnyAsync(u => u.Id == usuarioId && u.CooperativaId == cooperativaId
                && u.Activo == true && u.Rol.Codigo == RolBus, ct);
        if (!valido)
            throw new ReglaNegocioException(400, "El usuario no existe, está inactivo, no es BUS o es de otra cooperativa.");
    }

    private async Task GuardarCambiosAsync(CancellationToken ct)
    {
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            throw new ReglaNegocioException(409, "Ya existe un viaje para ese detalle de hoja de ruta.");
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.CheckViolation })
        {
            throw new ReglaNegocioException(400, "Los datos no cumplen las restricciones del viaje.");
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation })
        {
            throw new ReglaNegocioException(400, "Alguna referencia (bus, frecuencia, detalle o usuario) no existe.");
        }
    }

    public Task<ViajeDto> ActualizarEstadoAsync(
        long id, ActualizarEstadoViajeDto dto, long? cooperativaContexto, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task<ViajeDto> ReasignarUsuarioBusAsync(
        long id, ReasignarUsuarioBusDto dto, long? cooperativaContexto, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task<ViajeDto> CancelarAsync(long id, long? cooperativaContexto, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task<IReadOnlyList<ViajeDto>> GenerarDesdeHojaRutaAsync(
        long hojaRutaId, long? cooperativaContexto, CancellationToken ct = default)
        => throw new NotImplementedException();
}