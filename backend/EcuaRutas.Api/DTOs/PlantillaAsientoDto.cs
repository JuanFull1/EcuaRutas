namespace EcuaRutas.Api.DTOs;

public class PlantillaAsientoDto
{
    public long Id { get; set; }
    public long PlantillaId { get; set; }
    public long TipoAsientoId { get; set; }
    public string Numero { get; set; } = string.Empty;
    public int Piso { get; set; }
    public int? Fila { get; set; }
    public int? Columna { get; set; }
    public bool Activo { get; set; }
}