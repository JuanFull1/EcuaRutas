namespace EcuaRutas.Api.DTOs.Ventas;

public class DisponibilidadResponse
{
    public long ViajeId { get; set; }

    public long OrigenRutaParadaId { get; set; }

    public long DestinoRutaParadaId { get; set; }

    public List<AsientoDisponibleDto> Asientos { get; set; } = new();
}

public class AsientoDisponibleDto
{
    public long AsientoBusId { get; set; }

    public string Numero { get; set; } = null!;

    public short Piso { get; set; }

    public short? Fila { get; set; }

    public short? Columna { get; set; }

    public long TipoAsientoId { get; set; }

    public string TipoAsiento { get; set; } = null!;

    public decimal RecargoPorcentaje { get; set; }

    public decimal PrecioBase { get; set; }

    public decimal RecargoAsiento { get; set; }

    public decimal PrecioFinal { get; set; }
}