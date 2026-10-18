using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Viajes;

public class CrearViajeDto
{
    [Range(1, long.MaxValue)]
    public long BusId { get; set; }

    [Range(1, long.MaxValue)]
    public long FrecuenciaId { get; set; }

    [Required]
    public DateTime? SalidaProgramada { get; set; }

    public long? HojaRutaDetalleId { get; set; }

    public long? UsuarioBusId { get; set; }
}