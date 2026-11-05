namespace EcuaRutas.Api.DTOs.Ventas;

public sealed class BoletoOficinaDto
{
    public long BoletoId { get; set; }

    public long VentaId { get; set; }

    public string CodigoVenta { get; set; } = string.Empty;

    public string CodigoBoleto { get; set; } = string.Empty;

    public string QrToken { get; set; } = string.Empty;

    public string EstadoBoleto { get; set; } = string.Empty;

    public DateTime GeneradoEn { get; set; }

    public long ViajeId { get; set; }

    public string RutaNombre { get; set; } = string.Empty;

    public string Origen { get; set; } = string.Empty;

    public string Destino { get; set; } = string.Empty;

    public DateTime SalidaProgramada { get; set; }

    public string Pasajero { get; set; } = string.Empty;

    public string Documento { get; set; } = string.Empty;

    public long AsientoBusId { get; set; }

    public string NumeroAsiento { get; set; } = string.Empty;

    public decimal PrecioFinal { get; set; }
}