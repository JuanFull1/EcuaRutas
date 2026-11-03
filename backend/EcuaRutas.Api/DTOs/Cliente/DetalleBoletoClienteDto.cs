namespace EcuaRutas.Api.DTOs.Cliente;

public class DetalleBoletoClienteDto
{
    public long BoletoId { get; set; }
    public long VentaId { get; set; }
    public string CodigoVenta { get; set; } = string.Empty;
    public string CodigoBoleto { get; set; } = string.Empty;
    public string EstadoBoleto { get; set; } = string.Empty;
    public DateTime GeneradoEn { get; set; }
    public string? ArchivoUrl { get; set; }
    public long ViajeId { get; set; }
    public DateTime SalidaProgramada { get; set; }
    public long PasajeroId { get; set; }
    public long AsientoBusId { get; set; }
    public decimal PrecioFinal { get; set; }
}
