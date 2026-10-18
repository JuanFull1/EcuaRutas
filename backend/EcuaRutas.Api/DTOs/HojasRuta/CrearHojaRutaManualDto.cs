using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.HojasRuta;

public class CrearHojaRutaManualDto
{
    public long? CooperativaId { get; set; }

    [Range(1, long.MaxValue)]
    public long GrupoBusId { get; set; }

    [Required]
    public DateOnly Fecha { get; set; }

    [Required]
    [MinLength(1)]
    public List<DetalleHojaRutaManualDto> Detalles { get; set; } = new();
}