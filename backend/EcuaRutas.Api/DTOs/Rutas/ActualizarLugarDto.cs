using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Rutas;

// Representa una actualizacion completa; el identificador se recibira por la ruta HTTP.
public class ActualizarLugarDto
{
    [Required]
    [StringLength(150)]
    public string Nombre { get; set; } = string.Empty;

    [StringLength(100)]
    public string? Provincia { get; set; }

    [StringLength(100)]
    public string? Canton { get; set; }

    [Required]
    [StringLength(30)]
    [RegularExpression("^(CIUDAD|TERMINAL|PARADA)$")]
    public string Tipo { get; set; } = string.Empty;

    public CoordenadasDto? Ubicacion { get; set; }

    public required bool Activo { get; set; }
}
