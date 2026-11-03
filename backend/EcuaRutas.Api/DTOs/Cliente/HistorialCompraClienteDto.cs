
using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.DTOs.Cliente;

public class HistorialCompraClienteDto
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

    public List<BoletoClienteDto> Boletos { get; set; } = new();
}
