using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.OperacionBus;

public class AbordarPasajeroDto
{
    // Contenido del QR escaneado; el service lo resuelve a boleto y asiento vendido.
    [Required(ErrorMessage = "El código QR es obligatorio.")]
    [StringLength(255, ErrorMessage = "El código QR no puede superar {1} caracteres.")]
    public string QrToken { get; set; } = string.Empty;
}