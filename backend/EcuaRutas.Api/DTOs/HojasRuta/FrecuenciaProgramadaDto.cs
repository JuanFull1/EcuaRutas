using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.HojasRuta;

public class FrecuenciaProgramadaDto
{
    [Range(1, long.MaxValue)]
    public long FrecuenciaId { get; set; }

    // Si es null, el service usa Frecuencia.HoraSalida.
    public TimeOnly? HoraProgramada { get; set; }
}