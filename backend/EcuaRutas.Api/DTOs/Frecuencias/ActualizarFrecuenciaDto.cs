using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Frecuencias;

// Actualización completa, no PATCH: el ID se recibirá por la ruta HTTP.
// Codigo omitido o explícitamente nulo queda en null. Activa debe estar en JSON.
// El PR 6 validará referencias, unicidad incluso entre inactivas y protección
// de frecuencias utilizadas en viajes o documentos operativos.
public class ActualizarFrecuenciaDto
{
    [Range(typeof(long), "1", "9223372036854775807")]
    public required long CooperativaId { get; set; }

    [Range(typeof(long), "1", "9223372036854775807")]
    public required long RutaId { get; set; }

    [Range(typeof(long), "1", "9223372036854775807")]
    public required long ResolucionAntId { get; set; }

    [StringLength(50)]
    public string? Codigo { get; set; }

    [Required]
    public TimeOnly? HoraSalida { get; set; }

    public required bool Activa { get; set; }
}
