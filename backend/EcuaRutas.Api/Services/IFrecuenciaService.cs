using EcuaRutas.Api.DTOs.Frecuencias;

namespace EcuaRutas.Api.Services;

public interface IFrecuenciaService
{
    // Los filtros no sustituyen la autorización por cooperativa de la futura capa HTTP.
    Task<IReadOnlyList<FrecuenciaDto>> ListarAsync(long? cooperativaId = null, long? rutaId = null, CancellationToken ct = default);
    Task<FrecuenciaDto?> ObtenerAsync(long id, CancellationToken ct = default);
    Task<FrecuenciaDto> CrearAsync(CrearFrecuenciaDto request, CancellationToken ct = default);
    Task<FrecuenciaDto?> ActualizarAsync(long id, ActualizarFrecuenciaDto request, CancellationToken ct = default);
    Task<bool> DarDeBajaAsync(long id, CancellationToken ct = default);
}
