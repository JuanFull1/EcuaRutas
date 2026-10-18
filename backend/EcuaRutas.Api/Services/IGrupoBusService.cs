using EcuaRutas.Api.DTOs;

namespace EcuaRutas.Api.Services;

public interface IGrupoBusService
{
    Task<IReadOnlyList<GrupoBusDto>> ListarAsync(long cooperativaId, CancellationToken ct = default);
    Task<GrupoBusDto?> ObtenerAsync(long id, CancellationToken ct = default);
    Task<GrupoBusDto> CrearAsync(CrearGrupoBusRequest request, CancellationToken ct = default);
    Task<GrupoBusDto?> ActualizarAsync(long id, ActualizarGrupoBusRequest request, CancellationToken ct = default);
    Task<bool> DesactivarAsync(long id, CancellationToken ct = default);
}