namespace EcuaRutas.Api.DTOs.Ventas;

public class CrearReservaRequest
{
    public long ViajeId { get; set; }

    public long? UsuarioClienteId { get; set; }

    public long? UsuarioVendedorId { get; set; }

    public string Canal { get; set; } = null!;

    public int MinutosExpiracion { get; set; } = 15;

    public List<ReservaAsientoRequest> Asientos { get; set; } = new();
}

public class ReservaAsientoRequest
{
    public long PasajeroId { get; set; }

    public long AsientoBusId { get; set; }

    public long OrigenRutaParadaId { get; set; }

    public long DestinoRutaParadaId { get; set; }
}