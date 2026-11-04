using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Cooperativas;

public class CrearCooperativaRequest
{
    [Required(
        ErrorMessage = "El nombre de la cooperativa es obligatorio."
    )]
    [StringLength(
        150,
        ErrorMessage = "El nombre no puede superar los 150 caracteres."
    )]
    public string Nombre { get; set; } = string.Empty;

    [StringLength(
        20,
        ErrorMessage = "El RUC no puede superar los 20 caracteres."
    )]
    public string? Ruc { get; set; }

    [Required(
        ErrorMessage = "Los nombres del usuario son obligatorios."
    )]
    [StringLength(
        120,
        ErrorMessage = "Los nombres no pueden superar los 120 caracteres."
    )]
    public string UsuarioNombres { get; set; } = string.Empty;

    [Required(
        ErrorMessage = "Los apellidos del usuario son obligatorios."
    )]
    [StringLength(
        120,
        ErrorMessage = "Los apellidos no pueden superar los 120 caracteres."
    )]
    public string UsuarioApellidos { get; set; } = string.Empty;

    [Required(
        ErrorMessage = "El correo del usuario es obligatorio."
    )]
    [EmailAddress(
        ErrorMessage = "El correo del usuario no tiene un formato válido."
    )]
    [StringLength(
        150,
        ErrorMessage = "El correo no puede superar los 150 caracteres."
    )]
    public string UsuarioCorreo { get; set; } = string.Empty;

    [Required(
        ErrorMessage = "La contraseña es obligatoria."
    )]
    [MinLength(
        8,
        ErrorMessage = "La contraseña debe tener al menos 8 caracteres."
    )]
    [MaxLength(
        100,
        ErrorMessage = "La contraseña no puede superar los 100 caracteres."
    )]
    public string UsuarioPassword { get; set; } = string.Empty;

    [Required(
        ErrorMessage = "Debe confirmar la contraseña."
    )]
    [Compare(
        nameof(UsuarioPassword),
        ErrorMessage = "Las contraseñas no coinciden."
    )]
    public string UsuarioConfirmarPassword { get; set; } = string.Empty;
}