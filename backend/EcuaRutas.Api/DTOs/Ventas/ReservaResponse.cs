namespace EcuaRutas.Api.DTOs.Ventas;

public class ReservaResponse
{
    public long VentaId { get; set; }

    public string Codigo { get; set; } = null!;

    public long ViajeId { get; set; }

    public string Canal { get; set; } = null!;

    public string Estado { get; set; } = null!;

    public decimal Subtotal { get; set; }

    public decimal DescuentoTotal { get; set; }

    public decimal Total { get; set; }

    public DateTime ExpiraEn { get; set; }

    public List<string> CodigosBoletos { get; set; } = new();

    public List<ReservaAsientoResponse> Asientos { get; set; } = new();
}

public class ReservaAsientoResponse
{
    public long VentaAsientoId { get; set; }

    public long PasajeroId { get; set; }

    public long AsientoBusId { get; set; }

    public string NumeroAsiento { get; set; } = null!;

    public decimal PrecioBase { get; set; }

    public decimal RecargoAsiento { get; set; }

    public string TipoDescuento { get; set; } = null!;

    public decimal PorcentajeDescuento { get; set; }

    public decimal ValorDescuento { get; set; }

    public decimal PrecioFinal { get; set; }

    public string EstadoAsiento { get; set; } = null!;
}
