namespace EcuaRutas.Api.DTOs;

public class GrupoBusDto
{
    public long Id { get; set; }
    public long CooperativaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool Activo { get; set; }
}