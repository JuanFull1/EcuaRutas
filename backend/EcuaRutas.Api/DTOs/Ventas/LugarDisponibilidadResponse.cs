namespace EcuaRutas.Api.DTOs.Ventas;

public class LugarDisponibilidadResponse
{
    public long LugarId { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Provincia { get; set; }
    public string? Canton { get; set; }
}