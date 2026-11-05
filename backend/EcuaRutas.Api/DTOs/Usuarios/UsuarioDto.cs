namespace EcuaRutas.Api.DTOs.Usuarios;

public class UsuarioDto
{
    public long Id { get; set; }

    public string? Cedula { get; set; }

    public string Nombres { get; set; } = string.Empty;

    public string Apellidos { get; set; } = string.Empty;

    public string Correo { get; set; } = string.Empty;

    public string? Telefono { get; set; }

    public bool Activo { get; set; }

    public long RolId { get; set; }

    public string RolCodigo { get; set; } = string.Empty;

    public string RolNombre { get; set; } = string.Empty;

    public long? CooperativaId { get; set; }

    public string? CooperativaNombre { get; set; }

    public DateTime CreadoEn { get; set; }

    public DateTime ActualizadoEn { get; set; }
}