using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Cooperativas;

public class ActualizarMiCooperativaRequest
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
        2000,
        ErrorMessage = "La descripción no puede superar los 2000 caracteres."
    )]
    public string? Descripcion { get; set; }

    [StringLength(
        30,
        ErrorMessage = "El teléfono no puede superar los 30 caracteres."
    )]
    public string? Telefono { get; set; }

    [EmailAddress(
        ErrorMessage = "El correo electrónico no tiene un formato válido."
    )]
    [StringLength(
        150,
        ErrorMessage = "El correo no puede superar los 150 caracteres."
    )]
    public string? Correo { get; set; }

    [StringLength(
        500,
        ErrorMessage = "La dirección no puede superar los 500 caracteres."
    )]
    public string? Direccion { get; set; }

    [StringLength(
        500,
        ErrorMessage = "La URL del logo no puede superar los 500 caracteres."
    )]
    public string? LogoUrl { get; set; }

    [StringLength(
        20,
        ErrorMessage = "El color primario no puede superar los 20 caracteres."
    )]
    public string? ColorPrimario { get; set; }

    [StringLength(
        20,
        ErrorMessage = "El color secundario no puede superar los 20 caracteres."
    )]
    public string? ColorSecundario { get; set; }

    public string? RedesSociales { get; set; }

    [StringLength(
        2000,
        ErrorMessage = "La información de soporte no puede superar los 2000 caracteres."
    )]
    public string? InformacionSoporte { get; set; }
}