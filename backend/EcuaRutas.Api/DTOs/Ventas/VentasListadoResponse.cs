namespace EcuaRutas.Api.DTOs.Ventas;

public class VentaListadoResponse
{
    public long VentaId { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public string Canal { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public DateTime CreadoEn { get; set; }
    public DateTime? ExpiraEn { get; set; }
    public string? EstadoPago { get; set; }
    public string? MetodoPago { get; set; }
    public DateTime SalidaProgramada { get; set; }
    public string RutaNombre { get; set; } = string.Empty;
    public string Origen { get; set; } = string.Empty;
    public string Destino { get; set; } = string.Empty;
    public List<VentaListadoAsientoResponse> Asientos { get; set; } = new();
}

public class VentaListadoAsientoResponse
{
    public string Documento { get; set; } = string.Empty;
    public string Pasajero { get; set; } = string.Empty;
    public string NumeroAsiento { get; set; } = string.Empty;
    public decimal PrecioFinal { get; set; }
    public string? CodigoBoleto { get; set; }
    public string? EstadoBoleto { get; set; }
}

public class VentasPaginadasResponse
{
    public List<VentaListadoResponse> Items { get; set; } = new();
    public int Total { get; set; }
    public int Pagina { get; set; }
    public int TamanoPagina { get; set; }
}
