using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Viajes;

public class ActualizarEstadoViajeDto
{
    // Se valida contra EstadosViaje en el service.
    [Required]
    [StringLength(30)]
    public string Estado { get; set; } = string.Empty;
}