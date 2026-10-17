using EcuaRutas.Api.DTOs;

namespace EcuaRutas.Api.Services;

public interface IBusService
{
    Task<IReadOnlyList<BusDto>> ListarAsync(long cooperativaId, long? grupoBusId = null, string? estado = null, CancellationToken ct = default);
    Task<BusDto?> ObtenerAsync(long id, CancellationToken ct = default);
    Task<BusDto> CrearAsync(CrearBusRequest request, CancellationToken ct = default);
    Task<BusDto?> ActualizarAsync(long id, ActualizarBusRequest request, CancellationToken ct = default);
    Task<bool> DarDeBajaAsync(long id, CancellationToken ct = default);
}