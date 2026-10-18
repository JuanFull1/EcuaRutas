using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.HojasRuta;

public class SustituirBusDto
{
    // Bus de retén (PARADA) que reemplaza al bus averiado del detalle.
    [Range(1, long.MaxValue)]
    public long BusReemplazoId { get; set; }

    [Required]
    [StringLength(500)]
    public string Observacion { get; set; } = string.Empty;
}