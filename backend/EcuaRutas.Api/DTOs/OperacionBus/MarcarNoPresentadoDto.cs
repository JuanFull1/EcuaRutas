using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.OperacionBus;

public class MarcarNoPresentadoDto
{
    [Range(1, long.MaxValue, ErrorMessage = "El asiento vendido es obligatorio y debe ser un identificador válido.")]
    public long VentaAsientoId { get; set; }

    [StringLength(500, ErrorMessage = "La observación no puede superar {1} caracteres.")]
    public string? Observacion { get; set; }
}