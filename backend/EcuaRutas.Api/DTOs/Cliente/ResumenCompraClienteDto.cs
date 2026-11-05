
namespace EcuaRutas.Api.DTOs.Cliente;

public class ResumenCompraClienteDto
{
    public long VentaId { get; set; }

    public string Codigo { get; set; } = string.Empty;

    public long ViajeId { get; set; }

    public string Estado { get; set; } = string.Empty;

    public string Canal { get; set; } = string.Empty;

    public decimal Subtotal { get; set; }

    public decimal DescuentoTotal { get; set; }

    public decimal Total { get; set; }

    public DateTime CreadoEn { get; set; }

    public DateTime? ExpiraEn { get; set; }
}
