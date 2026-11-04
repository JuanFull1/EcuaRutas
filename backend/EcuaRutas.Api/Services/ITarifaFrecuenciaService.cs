using EcuaRutas.Api.DTOs.Tarifas;

namespace EcuaRutas.Api.Services;

public interface ITarifaFrecuenciaService
{
    Task<IReadOnlyList<TarifaFrecuenciaDto>> ListarAsync(CancellationToken ct = default);
    Task<TarifaFrecuenciaDto?> ObtenerAsync(long id, CancellationToken ct = default);
    Task<IReadOnlyList<TarifaFrecuenciaDto>> ListarPorFrecuenciaAsync(long frecuenciaId, CancellationToken ct = default);
    Task<TarifaFrecuenciaDto> CrearAsync(long frecuenciaId, CrearTarifaFrecuenciaDto request, CancellationToken ct = default);
    Task<TarifaFrecuenciaDto?> ActualizarAsync(long id, ActualizarTarifaFrecuenciaDto request, CancellationToken ct = default);
    Task<bool> DarDeBajaAsync(long id, CancellationToken ct = default);
}
