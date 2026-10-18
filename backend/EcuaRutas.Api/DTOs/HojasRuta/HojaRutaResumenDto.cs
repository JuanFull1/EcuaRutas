namespace EcuaRutas.Api.DTOs.HojasRuta;

public record HojaRutaResumenDto(
    long Id,
    long GrupoBusId,
    DateOnly Fecha,
    string ModoGeneracion,
    string Estado,
    int TotalServicios,
    int TotalParadas);