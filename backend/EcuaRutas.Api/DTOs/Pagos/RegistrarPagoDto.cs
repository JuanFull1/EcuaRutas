
using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Pagos;

public class RegistrarPagoDto
{
    [Required]
    [Range(1, long.MaxValue, ErrorMessage = "La venta es obligatoria.")]
    public long VentaId { get; set; }

    [Required(ErrorMessage = "El método de pago es obligatorio.")]
    [RegularExpression(
        "^(TRANSFERENCIA|DEPOSITO)$",
        ErrorMessage = "El método debe ser TRANSFERENCIA o DEPOSITO.")]
    public string Metodo { get; set; } = string.Empty;
}
