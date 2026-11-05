using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.HojasRuta;

public class SustituirBusDto
{
    // Bus de retén (PARADA) que reemplaza al bus averiado del detalle.
    [Range(1, long.MaxValue, ErrorMessage = "El bus de reemplazo es obligatorio y debe ser un identificador válido.")]
    public long BusReemplazoId { get; set; }

    [Required(ErrorMessage = "La observación es obligatoria.")]
    [StringLength(500, ErrorMessage = "La observación no puede superar {1} caracteres.")]
    public string Observacion { get; set; } = string.Empty;
}