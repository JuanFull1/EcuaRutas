using EcuaRutas.Api.DTOs.HojasRuta;

namespace EcuaRutas.Api.Services;

public interface IHojaRutaService
{
    Task<HojaRutaDto> CrearManualAsync(
        CrearHojaRutaManualDto dto, long? cooperativaContexto, CancellationToken ct = default);

    Task<IReadOnlyList<HojaRutaDto>> GenerarAutomaticaAsync(
        GenerarHojasRutaAutomaticaDto dto, long? cooperativaContexto, CancellationToken ct = default);

    Task<HojaRutaDto> ObtenerPorIdAsync(
        long id, long? cooperativaContexto, CancellationToken ct = default);

    Task<IReadOnlyList<HojaRutaResumenDto>> ListarAsync(
        long? cooperativaContexto, long? grupoBusId, DateOnly? desde, DateOnly? hasta, CancellationToken ct = default);

    Task<HojaRutaDto> PublicarAsync(
        long id, long? cooperativaContexto, CancellationToken ct = default);

    Task<HojaRutaDto> CerrarAsync(
        long id, long? cooperativaContexto, CancellationToken ct = default);

    Task<HojaRutaDto> SustituirBusAsync(
        long hojaRutaId, long detalleId, SustituirBusDto dto, long? cooperativaContexto, CancellationToken ct = default);
}