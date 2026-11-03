
namespace EcuaRutas.Api.DTOs.Cliente;

public class BoletoClienteDto
{
    public string Documento { get; set; } = string.Empty;

    public string Pasajero { get; set; } = string.Empty;

    public string NumeroAsiento { get; set; } = string.Empty;

    public decimal PrecioFinal { get; set; }

    public string? CodigoBoleto { get; set; }

    public string? EstadoBoleto { get; set; }
}
