using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Usuarios;

public class RestablecerPasswordRequest
{
    [Required]
    [MinLength(8)]
    [MaxLength(100)]
    public string NuevaPassword { get; set; } = string.Empty;

    [Required]
    [Compare(
        nameof(NuevaPassword),
        ErrorMessage = "Las contraseñas no coinciden."
    )]
    public string ConfirmarPassword { get; set; } = string.Empty;
}