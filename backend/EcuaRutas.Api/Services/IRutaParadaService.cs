using EcuaRutas.Api.DTOs.Rutas;

namespace EcuaRutas.Api.Services;

public interface IRutaParadaService
{
    // Ruta inexistente genera RecursoNoEncontradoException; una ruta sin paradas devuelve lista vacia.
    Task<IReadOnlyList<RutaParadaDto>> ListarAsync(long rutaId, CancellationToken ct = default);
    Task<RutaParadaDto?> ObtenerAsync(long rutaId, long id, CancellationToken ct = default);
    Task<RutaParadaDto> CrearAsync(long rutaId, CrearRutaParadaDto request, CancellationToken ct = default);
    // Parada inexistente en esta ruta devuelve null; las paradas referenciadas no se modifican.
    Task<RutaParadaDto?> ActualizarAsync(long rutaId, long id, ActualizarRutaParadaDto request, CancellationToken ct = default);
    // False indica parada inexistente en esta ruta; solo elimina paradas sin referencias operativas.
    Task<bool> EliminarAsync(long rutaId, long id, CancellationToken ct = default);
}
