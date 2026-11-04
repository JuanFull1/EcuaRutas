namespace EcuaRutas.Api.DTOs.Cliente;

public sealed class CrearReservaClienteRequest
{
    public long ViajeId { get; set; }
    public long AsientoBusId { get; set; }
    public long OrigenRutaParadaId { get; set; }
    public long DestinoRutaParadaId { get; set; }
    public string Documento { get; set; } = string.Empty;
}
