namespace EcuaRutas.Api.DTOs.HojasRuta;

public record HojaRutaDetalleDto(
    long Id,
    long HojaRutaId,
    long BusId,
    long? FrecuenciaId,
    string TipoAsignacion,
    int OrdenDia,
    TimeOnly? HoraProgramada,
    string? Observacion);