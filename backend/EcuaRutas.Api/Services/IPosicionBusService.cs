using EcuaRutas.Api.DTOs.PosicionesBus;

namespace EcuaRutas.Api.Services;

public interface IPosicionBusService
{
    Task<PosicionBusDto> RegistrarAsync(
        long viajeId, long usuarioBusId, RegistrarPosicionBusDto dto, CancellationToken ct = default);

    Task<PosicionBusDto> ObtenerUltimaAsync(long viajeId, long? cooperativaContexto, CancellationToken ct = default);
}