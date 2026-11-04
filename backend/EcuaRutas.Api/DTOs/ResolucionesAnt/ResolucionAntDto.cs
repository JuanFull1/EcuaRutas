namespace EcuaRutas.Api.DTOs.ResolucionesAnt;

public class ResolucionAntDto
{
    public long Id { get; set; }

    public long CooperativaId { get; set; }

    public string NumeroResolucion { get; set; } = string.Empty;

    public DateOnly? FechaResolucion { get; set; }

    public string? ArchivoUrl { get; set; }

    public bool Activa { get; set; }
}
