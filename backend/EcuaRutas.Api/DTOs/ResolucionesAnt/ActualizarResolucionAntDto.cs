using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.ResolucionesAnt;

// Actualización completa, no PATCH: el ID se recibirá por la ruta HTTP.
// Los campos opcionales pueden quedar en null. Activa debe estar presente en JSON.
// La unicidad por cooperativa y las reglas de persistencia corresponden al PR 6.
public class ActualizarResolucionAntDto
{
    [Range(typeof(long), "1", "9223372036854775807")]
    public required long CooperativaId { get; set; }

    [Required]
    [StringLength(100)]
    public string NumeroResolucion { get; set; } = string.Empty;

    public DateOnly? FechaResolucion { get; set; }

    [StringLength(500)]
    public string? ArchivoUrl { get; set; }

    public required bool Activa { get; set; }
}
