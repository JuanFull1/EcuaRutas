namespace EcuaRutas.Api.DTOs.Frecuencias;

public class FrecuenciaDto
{
    public long Id { get; set; }

    public long CooperativaId { get; set; }

    public long RutaId { get; set; }

    public long ResolucionAntId { get; set; }

    public string? Codigo { get; set; }

    public TimeOnly HoraSalida { get; set; }

    public bool Activa { get; set; }
}
