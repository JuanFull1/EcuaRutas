namespace EcuaRutas.Api.DTOs.Ventas;

public class ViajeDisponibilidadResponse
{
    public long ViajeId { get; set; }

    public long FrecuenciaId { get; set; }

    public long RutaId { get; set; }

    public string RutaNombre { get; set; } = null!;

    public string? CodigoFrecuencia { get; set; }

    public DateTime SalidaProgramada { get; set; }

    public string Estado { get; set; } = null!;

    public long BusId { get; set; }

    public string NumeroInternoBus { get; set; } = null!;

    public string PlacaBus { get; set; } = null!;

    public short CapacidadBus { get; set; }

    public long OrigenRutaParadaId { get; set; }

    public long DestinoRutaParadaId { get; set; }

    public decimal PrecioBase { get; set; }

    public string Cooperativa { get; set; } = null!;
}