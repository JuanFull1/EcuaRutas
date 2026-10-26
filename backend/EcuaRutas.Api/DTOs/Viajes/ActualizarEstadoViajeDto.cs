using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Viajes;

public class ActualizarEstadoViajeDto
{
    // Se valida contra EstadosViaje en el service.
    [Required(ErrorMessage = "El estado del viaje es obligatorio.")]
    [StringLength(30, ErrorMessage = "El estado no puede superar {1} caracteres.")]
    [RegularExpression("^(PROGRAMADO|ABIERTO|EN_CURSO|FINALIZADO|CANCELADO)$",
        ErrorMessage = "El estado debe ser PROGRAMADO, ABIERTO, EN_CURSO, FINALIZADO o CANCELADO.")]
    public string Estado { get; set; } = string.Empty;
}