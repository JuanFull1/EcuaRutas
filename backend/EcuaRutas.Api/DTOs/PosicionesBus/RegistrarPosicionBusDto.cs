using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.PosicionesBus;

public class RegistrarPosicionBusDto
{
    [Range(-90.0, 90.0, ErrorMessage = "La latitud debe estar entre {1} y {2}.")]
    public double Latitud { get; set; }

    [Range(-180.0, 180.0, ErrorMessage = "La longitud debe estar entre {1} y {2}.")]
    public double Longitud { get; set; }

    [Range(0.0, 300.0, ErrorMessage = "La velocidad debe estar entre {1} y {2} km/h.")]
    public decimal? VelocidadKmh { get; set; }

    [Range(0.0, 100000.0, ErrorMessage = "La precisión debe estar entre {1} y {2} metros.")]
    public decimal? PrecisionMetros { get; set; }
}