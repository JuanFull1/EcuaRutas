namespace EcuaRutas.Api.DTOs.Usuarios;

public class RolDto
{
    public long Id { get; set; }

    public string Codigo { get; set; } = string.Empty;

    public string Nombre { get; set; } = string.Empty;

    public int CantidadUsuarios { get; set; }
}