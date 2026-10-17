namespace EcuaRutas.Api.DTOs.Rutas;

public class RutaDto
{
    public long Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public long OrigenLugarId { get; set; }

    public long DestinoLugarId { get; set; }

    public string TipoViaje { get; set; } = string.Empty;

    public bool Activa { get; set; }
}
