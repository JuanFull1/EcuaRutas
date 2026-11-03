
using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Cliente;

public class CrearNotificacionDto
{
    [Required]
    [Range(1, long.MaxValue)]
    public long UsuarioId { get; set; }

    public long? VentaId { get; set; }

    [Required]
    [StringLength(50)]
    public string Tipo { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string Asunto { get; set; } = string.Empty;
}
