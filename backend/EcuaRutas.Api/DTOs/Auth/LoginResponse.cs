namespace EcuaRutas.Api.DTOs.Auth;

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;

    public DateTime ExpiraEn { get; set; }

    public UsuarioAuthDto Usuario { get; set; } = new();
}

public class UsuarioAuthDto
{
    public long Id { get; set; }

    public string Nombres { get; set; } = string.Empty;

    public string Apellidos { get; set; } = string.Empty;

    public string Correo { get; set; } = string.Empty;

    public string Rol { get; set; } = string.Empty;

    public long? CooperativaId { get; set; }
}