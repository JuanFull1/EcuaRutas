using EcuaRutas.Api.DTOs.Rutas;

namespace EcuaRutas.Api.Services;

public interface IRutaService
{
    // Las consultas incluyen rutas activas e inactivas.
    Task<IReadOnlyList<RutaDto>> ListarAsync(CancellationToken ct = default);
    Task<RutaDto?> ObtenerAsync(long id, CancellationToken ct = default);
    Task<RutaDto> CrearAsync(CrearRutaDto request, CancellationToken ct = default);
    // Devuelve null si la ruta no existe; preserva las referencias operativas.
    Task<RutaDto?> ActualizarAsync(long id, ActualizarRutaDto request, CancellationToken ct = default);
    // Baja logica idempotente; false indica que la ruta no existe.
    Task<bool> DarDeBajaAsync(long id, CancellationToken ct = default);
}
