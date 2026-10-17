using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Rutas;

// Representa una actualizacion completa; el identificador se recibira por la ruta HTTP.
public class ActualizarRutaDto
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

    public required bool Activa { get; set; }
}
