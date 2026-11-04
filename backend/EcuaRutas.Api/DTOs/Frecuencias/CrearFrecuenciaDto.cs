using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Frecuencias;

// El servidor determinará el alta activa conforme al SQL DEFAULT TRUE.
// La unicidad (CooperativaId, RutaId, HoraSalida) también incluye inactivas;
// Codigo no es único. Existencia, pertenencia y actividad se validarán en el PR 6.
public class CrearFrecuenciaDto
{
    [Range(typeof(long), "1", "9223372036854775807")]
    public required long CooperativaId { get; set; }

    [Range(typeof(long), "1", "9223372036854775807")]
    public required long RutaId { get; set; }

    [Range(typeof(long), "1", "9223372036854775807")]
    public required long ResolucionAntId { get; set; }

    [StringLength(50)]
    public string? Codigo { get; set; }

    // null representa ausencia; TimeOnly.MinValue representa medianoche y es válido.
    [Required]
    public TimeOnly? HoraSalida { get; set; }
}
