namespace EcuaRutas.Api.DTOs.OperacionBus;

public record ViajeAsignadoDto(
    long ViajeId,
    string Estado,
    DateTime SalidaProgramada,
    DateTime? IniciadoEn,
    long BusId,
    string NumeroInterno,
    string Placa,
    long FrecuenciaId,
    string Origen,
    string Destino);