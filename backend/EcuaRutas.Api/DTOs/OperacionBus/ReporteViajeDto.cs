namespace EcuaRutas.Api.DTOs.OperacionBus;

public record ReporteViajeDto(
    long ViajeId,
    string Estado,
    DateTime SalidaProgramada,
    DateTime? IniciadoEn,
    DateTime? FinalizadoEn,
    int? DuracionMinutos,
    int TotalAbordados,
    int TotalNoPresentados,
    int TotalLiberados,
    decimal IngresosGenerados);