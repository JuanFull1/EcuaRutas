namespace EcuaRutas.Api.DTOs;

public class BusDto
{
    public long Id { get; set; }
    public long CooperativaId { get; set; }
    public long? GrupoBusId { get; set; }
    public long? PlantillaId { get; set; }
    public string NumeroInterno { get; set; } = string.Empty;
    public string Placa { get; set; } = string.Empty;
    public string? Color { get; set; }
    public string? MarcaChasis { get; set; }
    public string? MarcaCarroceria { get; set; }
    public string? Modelo { get; set; }
    public int? Anio { get; set; }
    public int Pisos { get; set; }
    public int Capacidad { get; set; }
    public bool TieneBanio { get; set; }
    public string? FotoUrl { get; set; }
    public string Estado { get; set; } = string.Empty;
}