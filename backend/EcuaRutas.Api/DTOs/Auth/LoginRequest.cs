using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Auth;

public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Correo { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}