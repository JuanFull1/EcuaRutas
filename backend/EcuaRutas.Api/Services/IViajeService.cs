using EcuaRutas.Api.DTOs.Viajes;

namespace EcuaRutas.Api.Services;

public interface IViajeService
{
    Task<ViajeDto> CrearAsync(CrearViajeDto dto, long? cooperativaContexto, CancellationToken ct = default);

    Task<ViajeDto> ObtenerPorIdAsync(long id, long? cooperativaContexto, CancellationToken ct = default);

    Task<IReadOnlyList<ViajeDto>> ListarAsync(
        long? cooperativaContexto, DateOnly? desde, DateOnly? hasta, string? estado, long? busId,
        CancellationToken ct = default);

    Task<ViajeDto> ActualizarEstadoAsync(
        long id, ActualizarEstadoViajeDto dto, long? cooperativaContexto, CancellationToken ct = default);

    Task<ViajeDto> ReasignarUsuarioBusAsync(
        long id, ReasignarUsuarioBusDto dto, long? cooperativaContexto, CancellationToken ct = default);

    Task<ViajeDto> CancelarAsync(long id, long? cooperativaContexto, CancellationToken ct = default);

    Task<IReadOnlyList<ViajeDto>> GenerarDesdeHojaRutaAsync(
        long hojaRutaId, long? cooperativaContexto, CancellationToken ct = default);
}