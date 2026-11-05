using EcuaRutas.Api.DTOs.ResolucionesAnt;

namespace EcuaRutas.Api.Services;

public interface IResolucionAntService
{
    Task<IReadOnlyList<ResolucionAntDto>> ListarAsync(CancellationToken ct = default);
    Task<ResolucionAntDto?> ObtenerAsync(long id, CancellationToken ct = default);
    Task<ResolucionAntDto> CrearAsync(CrearResolucionAntDto request, CancellationToken ct = default);
    Task<ResolucionAntDto?> ActualizarAsync(long id, ActualizarResolucionAntDto request, CancellationToken ct = default);
    Task<bool> DarDeBajaAsync(long id, CancellationToken ct = default);
}
