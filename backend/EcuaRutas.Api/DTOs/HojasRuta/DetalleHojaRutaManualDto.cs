using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.HojasRuta;

public class DetalleHojaRutaManualDto
{
    [Range(1, long.MaxValue)]
    public long BusId { get; set; }

    // Requerida si TipoAsignacion = SERVICIO; debe ser null si es PARADA (se valida en el service).
    public long? FrecuenciaId { get; set; }

    [Required]
    [StringLength(20)]
    public string TipoAsignacion { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int OrdenDia { get; set; } = 1;

    public TimeOnly? HoraProgramada { get; set; }

    public string? Observacion { get; set; }
}