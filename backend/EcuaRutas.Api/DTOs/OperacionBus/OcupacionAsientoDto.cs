namespace EcuaRutas.Api.DTOs.OperacionBus;

public record OcupacionAsientoDto(
    long Id,
    long VentaAsientoId,
    long ViajeId,
    long AsientoBusId,
    long PasajeroId,
    long ParadaAbordajeId,
    long? ParadaLiberacionId,
    string Estado,
    DateTime AbordadoEn,
    DateTime? LiberadoEn,
    string? Observacion);