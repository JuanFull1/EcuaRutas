using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.HojasRuta;

public class CrearHojaRutaManualDto
{
    public long? CooperativaId { get; set; }

    [Range(1, long.MaxValue, ErrorMessage = "El grupo de buses es obligatorio y debe ser un identificador válido.")]
    public long GrupoBusId { get; set; }

    [Required(ErrorMessage = "La fecha de la hoja de ruta es obligatoria.")]
    public DateOnly? Fecha { get; set; }

    [Required(ErrorMessage = "Los detalles de la hoja de ruta son obligatorios.")]
    [MinLength(1, ErrorMessage = "La hoja de ruta debe tener al menos un detalle.")]
    public List<DetalleHojaRutaManualDto> Detalles { get; set; } = new();
}