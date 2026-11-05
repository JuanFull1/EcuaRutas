namespace EcuaRutas.Api.DTOs;

public class TipoAsientoDto
{
    public long Id { get; set; }
    public long? CooperativaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public decimal RecargoPorcentaje { get; set; }
    public bool Activo { get; set; }
}