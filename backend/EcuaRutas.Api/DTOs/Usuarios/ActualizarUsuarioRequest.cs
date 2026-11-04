using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Usuarios;

public class ActualizarUsuarioRequest
{
    [StringLength(20)]
    public string? Cedula { get; set; }

    [Required]
    [StringLength(120)]
    public string Nombres { get; set; } = string.Empty;

    [Required]
    [StringLength(120)]
    public string Apellidos { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(150)]
    public string Correo { get; set; } = string.Empty;

    [StringLength(30)]
    public string? Telefono { get; set; }

    [Range(1, long.MaxValue)]
    public long RolId { get; set; }

    public long? CooperativaId { get; set; }
}