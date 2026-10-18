using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.HojasRuta;

public class GenerarHojasRutaAutomaticaDto
{
    public long? CooperativaId { get; set; }

    [Range(1, long.MaxValue)]
    public long GrupoBusId { get; set; }

    [Required]
    public DateOnly FechaInicio { get; set; }

    [Required]
    public DateOnly FechaFin { get; set; }

    [Required]
    [MinLength(1)]
    public List<FrecuenciaProgramadaDto> Frecuencias { get; set; } = new();
}