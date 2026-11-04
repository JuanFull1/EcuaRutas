using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.ResolucionesAnt;

// El alta activa corresponde al servidor, como en CrearRutaDto (SQL DEFAULT TRUE).
// La unicidad (CooperativaId, NumeroResolucion), incluso entre inactivas, y la
// existencia/estado de la cooperativa se comprobarán en los servicios del PR 6.
public class CrearResolucionAntDto
{
    [Range(typeof(long), "1", "9223372036854775807")]
    public required long CooperativaId { get; set; }

    [Required]
    [StringLength(100)]
    public string NumeroResolucion { get; set; } = string.Empty;

    public DateOnly? FechaResolucion { get; set; }

    [StringLength(500)]
    public string? ArchivoUrl { get; set; }
}
