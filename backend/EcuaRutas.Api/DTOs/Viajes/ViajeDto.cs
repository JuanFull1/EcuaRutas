namespace EcuaRutas.Api.DTOs.Viajes;

public record ViajeDto(
    long Id,
    long? HojaRutaDetalleId,
    long BusId,
    long FrecuenciaId,
    long? UsuarioBusId,
    DateTime SalidaProgramada,
    DateTime? IniciadoEn,
    DateTime? FinalizadoEn,
    string Estado);