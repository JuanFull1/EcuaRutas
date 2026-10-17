using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Rutas;

public class CrearLugarDto
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
}
