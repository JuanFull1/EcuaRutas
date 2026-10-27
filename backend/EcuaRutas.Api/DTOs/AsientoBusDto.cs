namespace EcuaRutas.Api.DTOs;

public class AsientoBusDto
{
    public long Id { get; set; }
    public long BusId { get; set; }
    public long TipoAsientoId { get; set; }
    public string TipoAsiento { get; set; } = null!;
    public decimal RecargoPorcentaje { get; set; }
    public string Numero { get; set; } = null!;
    public int Piso { get; set; }
    public int? Fila { get; set; }
    public int? Columna { get; set; }
    public bool Activo { get; set; }
}
