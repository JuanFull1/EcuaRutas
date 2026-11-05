using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.HojasRuta;

public class GenerarHojasRutaAutomaticaDto
{
    public long? CooperativaId { get; set; }

    [Range(1, long.MaxValue, ErrorMessage = "El grupo de buses es obligatorio y debe ser un identificador válido.")]
    public long GrupoBusId { get; set; }

    [Required(ErrorMessage = "La fecha de inicio es obligatoria.")]
    public DateOnly? FechaInicio { get; set; }

    [Required(ErrorMessage = "La fecha de fin es obligatoria.")]
    public DateOnly? FechaFin { get; set; }

    [Required(ErrorMessage = "Las frecuencias a programar son obligatorias.")]
    [MinLength(1, ErrorMessage = "Debe indicar al menos una frecuencia.")]
    public List<FrecuenciaProgramadaDto> Frecuencias { get; set; } = new();
}