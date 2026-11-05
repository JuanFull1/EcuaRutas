using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Cooperativas;

public class ActualizarCooperativaAdminRequest
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
}