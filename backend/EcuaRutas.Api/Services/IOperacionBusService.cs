using EcuaRutas.Api.DTOs.OperacionBus;
using EcuaRutas.Api.DTOs.Viajes;

namespace EcuaRutas.Api.Services;

public interface IOperacionBusService
{
    Task<IReadOnlyList<ViajeAsignadoDto>> ListarViajesAsignadosAsync(long usuarioBusId, CancellationToken ct = default);
    Task<ViajeDto> IniciarViajeAsync(long viajeId, long usuarioBusId, CancellationToken ct = default);

    Task<OcupacionAsientoDto> AbordarPasajeroAsync(
        long viajeId, long usuarioBusId, AbordarPasajeroDto dto, CancellationToken ct = default);

    Task<OcupacionAsientoDto> MarcarNoPresentadoAsync(
        long viajeId, long usuarioBusId, MarcarNoPresentadoDto dto, CancellationToken ct = default);

    Task<OcupacionAsientoDto> LiberarAsientoAsync(
        long viajeId, long ocupacionId, long usuarioBusId, LiberarAsientoDto dto, CancellationToken ct = default);
}