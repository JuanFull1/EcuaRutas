namespace EcuaRutas.Api.DTOs.PosicionesBus;

public record PosicionBusDto(
    long Id,
    long ViajeId,
    long BusId,
    double Latitud,
    double Longitud,
    decimal? VelocidadKmh,
    decimal? PrecisionMetros,
    DateTime RegistradoEn);