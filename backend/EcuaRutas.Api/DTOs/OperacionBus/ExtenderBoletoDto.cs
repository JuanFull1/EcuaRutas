using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.OperacionBus;

public class ExtenderBoletoDto
{
    [Range(1, long.MaxValue, ErrorMessage = "El nuevo destino es obligatorio y debe ser un identificador válido.")]
    public long DestinoNuevoId { get; set; }

    [Range(0.01, 10000, ErrorMessage = "El monto adicional debe estar entre {1} y {2}.")]
    public decimal MontoAdicional { get; set; }

    [Required(ErrorMessage = "El método de pago es obligatorio.")]
    [RegularExpression("^(EFECTIVO|TRANSFERENCIA|DEPOSITO)$",
        ErrorMessage = "El método de pago debe ser EFECTIVO, TRANSFERENCIA o DEPOSITO.")]
    public string MetodoPago { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "La observación no puede superar {1} caracteres.")]
    public string? Observacion { get; set; }
}