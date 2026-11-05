namespace EcuaRutas.Api.DTOs;

public class PlantillaBusDto
{
    public long Id { get; set; }
    public long? CooperativaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public int Pisos { get; set; }
    public bool TieneBanio { get; set; }
    public bool Activa { get; set; }
}