
using System;

namespace EcuaRutas.Api.DTOs.Cliente;

public class ViajeClienteDto
{
    public long ViajeId { get; set; }

    public long FrecuenciaId { get; set; }

    public long RutaId { get; set; }

    public string RutaNombre { get; set; } = string.Empty;

    public string? CodigoFrecuencia { get; set; }

    public DateTime SalidaProgramada { get; set; }

    public string Estado { get; set; } = string.Empty;

    public long BusId { get; set; }

    public string NumeroInternoBus { get; set; } = string.Empty;

    public string PlacaBus { get; set; } = string.Empty;

    public short CapacidadBus { get; set; }

    public long OrigenRutaParadaId { get; set; }

    public long DestinoRutaParadaId { get; set; }

    public decimal PrecioBase { get; set; }

    public string Cooperativa { get; set; } = string.Empty;
}

