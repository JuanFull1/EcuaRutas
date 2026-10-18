using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.HojasRuta;

public class FrecuenciaProgramadaDto
{
    [Range(1, long.MaxValue, ErrorMessage = "La frecuencia es obligatoria y debe ser un identificador válido.")]
    public long FrecuenciaId { get; set; }

    // Si es null, el service usa Frecuencia.HoraSalida.
    public TimeOnly? HoraProgramada { get; set; }
}