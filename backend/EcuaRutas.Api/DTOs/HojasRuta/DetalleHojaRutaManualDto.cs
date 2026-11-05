using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.HojasRuta;

public class DetalleHojaRutaManualDto
{
    [Range(1, long.MaxValue, ErrorMessage = "El bus es obligatorio y debe ser un identificador válido.")]
    public long BusId { get; set; }

    // Requerida si TipoAsignacion = SERVICIO; debe ser null si es PARADA (se valida en el service).
    public long? FrecuenciaId { get; set; }

    [Required(ErrorMessage = "El tipo de asignación es obligatorio.")]
    [StringLength(20, ErrorMessage = "El tipo de asignación no puede superar {1} caracteres.")]
    [RegularExpression("^(SERVICIO|PARADA)$", ErrorMessage = "El tipo de asignación debe ser SERVICIO o PARADA.")]
    public string TipoAsignacion { get; set; } = string.Empty;

    [Range(1, int.MaxValue, ErrorMessage = "El orden del día debe ser mayor o igual a 1.")]
    public int OrdenDia { get; set; } = 1;

    public TimeOnly? HoraProgramada { get; set; }

    [StringLength(500, ErrorMessage = "La observación no puede superar {1} caracteres.")]
    public string? Observacion { get; set; }
}