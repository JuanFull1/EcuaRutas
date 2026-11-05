using EcuaRutas.Api.DTOs;

namespace EcuaRutas.Api.Services;

public interface IPlantillaService
{
    // Tipos de asiento (normal, VIP, preferencial...)
    Task<IReadOnlyList<TipoAsientoDto>> ListarTiposAsientoAsync(
        long? cooperativaId = null, CancellationToken ct = default);

    Task<TipoAsientoDto?> ObtenerTipoAsientoAsync(long id, CancellationToken ct = default);

    Task<TipoAsientoDto> CrearTipoAsientoAsync(
        CrearTipoAsientoRequest request, CancellationToken ct = default);

    // Devuelve null si el tipo no existe.
    Task<TipoAsientoDto?> ActualizarTipoAsientoAsync(
        long id, ActualizarTipoAsientoRequest request, CancellationToken ct = default);

    // Desactiva el tipo (no se borra: los asientos ya creados lo referencian).
    // Devuelve false si no existe.
    Task<bool> DesactivarTipoAsientoAsync(long id, CancellationToken ct = default);

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

    // Cambia el nombre y si tiene baño. Los pisos no cambian: dependen de los asientos.
    // Devuelve null si la plantilla no existe.
    Task<PlantillaBusDto?> ActualizarAsync(
        long id, ActualizarPlantillaBusRequest request, CancellationToken ct = default);

    // Desactiva la plantilla (no se borra: los buses pueden referenciarla).
    // Devuelve false si no existe.
    Task<bool> DesactivarAsync(long id, CancellationToken ct = default);

    // Copia los asientos de la plantilla al bus. Devuelve false si el bus o la plantilla no existen.
    Task<bool> AsignarABusAsync(
        long busId, long plantillaId, CancellationToken ct = default);

    // Lista los asientos activos de un bus. Devuelve null si el bus no existe.
    Task<IReadOnlyList<AsientoBusDto>?> ListarAsientosDeBusAsync(long busId, CancellationToken ct = default);
}
