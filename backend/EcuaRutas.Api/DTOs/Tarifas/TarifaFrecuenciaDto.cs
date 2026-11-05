namespace EcuaRutas.Api.DTOs.Tarifas;

public class TarifaFrecuenciaDto
{
    public long Id { get; set; }

    public long FrecuenciaId { get; set; }

    public long OrigenRutaParadaId { get; set; }

    public long DestinoRutaParadaId { get; set; }

    public decimal PrecioBase { get; set; }

    public bool Activa { get; set; }
}
