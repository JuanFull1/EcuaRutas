namespace EcuaRutas.Api.DTOs.HojasRuta;

public record HojaRutaDto(
    long Id,
    long CooperativaId,
    long GrupoBusId,
    DateOnly Fecha,
    string ModoGeneracion,
    string Estado,
    DateTime CreadoEn,
    IReadOnlyList<HojaRutaDetalleDto> Detalles);