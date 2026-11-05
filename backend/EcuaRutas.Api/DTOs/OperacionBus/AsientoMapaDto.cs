namespace EcuaRutas.Api.DTOs.OperacionBus;

public record AsientoMapaDto(
    long AsientoBusId,
    string Numero,
    int Piso,
    int? Fila,
    int? Columna,
    string TipoAsiento,
    string Estado,
    long? VentaAsientoId,
    long? OcupacionId,
    string? PasajeroNombre);