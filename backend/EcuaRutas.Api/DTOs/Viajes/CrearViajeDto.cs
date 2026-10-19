using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Viajes;

public class CrearViajeDto
{
    [Range(1, long.MaxValue, ErrorMessage = "El bus es obligatorio y debe ser un identificador válido.")]
    public long BusId { get; set; }

    [Range(1, long.MaxValue, ErrorMessage = "La frecuencia es obligatoria y debe ser un identificador válido.")]
    public long FrecuenciaId { get; set; }

    [Required(ErrorMessage = "La salida programada es obligatoria.")]
    public DateTime? SalidaProgramada { get; set; }

    public long? HojaRutaDetalleId { get; set; }

    public long? UsuarioBusId { get; set; }
}