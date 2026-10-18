using EcuaRutas.Api.DTOs;

namespace EcuaRutas.Api.Services;

public interface IPlantillaService
{
    // Tipos de asiento (normal, VIP, preferencial...)
    Task<IReadOnlyList<TipoAsientoDto>> ListarTiposAsientoAsync(
        long? cooperativaId = null, CancellationToken ct = default);

    // Plantillas de bus
    Task<IReadOnlyList<PlantillaBusDto>> ListarAsync(
        long? cooperativaId = null, CancellationToken ct = default);

    Task<PlantillaBusDto?> ObtenerAsync(long id, CancellationToken ct = default);

    Task<PlantillaBusDto> CrearAsync(
        CrearPlantillaBusRequest request, CancellationToken ct = default);

    // Disposición de asientos de una plantilla
    Task<IReadOnlyList<PlantillaAsientoDto>?> ObtenerDisposicionAsync(
        long plantillaId, CancellationToken ct = default);

    // Reemplaza la disposición completa. Devuelve null si la plantilla no existe.
    Task<IReadOnlyList<PlantillaAsientoDto>?> DefinirDisposicionAsync(
        long plantillaId,
        IReadOnlyList<CrearAsientoPlantillaRequest> asientos,
        CancellationToken ct = default);

    // Copia los asientos de la plantilla al bus. Devuelve false si el bus o la plantilla no existen.
    Task<bool> AsignarABusAsync(
        long busId, long plantillaId, CancellationToken ct = default);
}