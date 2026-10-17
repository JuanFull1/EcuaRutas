using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Rutas;

public class CrearRutaDto
{
    [Required]
    [StringLength(200)]
    public string Nombre { get; set; } = string.Empty;

    [Range(typeof(long), "1", "9223372036854775807")]
    public required long OrigenLugarId { get; set; }

    [Range(typeof(long), "1", "9223372036854775807")]
    public required long DestinoLugarId { get; set; }

    [Required]
    [StringLength(30)]
    [RegularExpression("^(DIRECTO|CON_PARADAS)$")]
    public string TipoViaje { get; set; } = string.Empty;
}
