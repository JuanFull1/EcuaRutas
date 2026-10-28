using EcuaRutas.Api.DTOs.Rutas;

namespace EcuaRutas.Api.Services;

public interface ILugarService
{
    // Incluye lugares activos e inactivos para conservar el acceso a referencias existentes.
    Task<IReadOnlyList<LugarDto>> ListarAsync(CancellationToken ct = default);

    // Incluye lugares inactivos; devuelve null si el identificador no existe.
    Task<LugarDto?> ObtenerAsync(long id, CancellationToken ct = default);

    Task<LugarDto> CrearAsync(CrearLugarDto request, CancellationToken ct = default);

    // Actualizacion completa: Ubicacion null elimina la ubicacion; devuelve null si no existe.
    Task<LugarDto?> ActualizarAsync(long id, ActualizarLugarDto request, CancellationToken ct = default);

    // Baja logica idempotente; devuelve false solo si el lugar no existe.
    Task<bool> DarDeBajaAsync(long id, CancellationToken ct = default);
}
