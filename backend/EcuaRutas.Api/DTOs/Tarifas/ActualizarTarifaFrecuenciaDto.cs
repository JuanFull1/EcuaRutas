using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Tarifas;

// Actualización completa: los identificadores de frecuencia y tarifa irán en la URL.
// Las reglas relacionales, referencias operativas y duplicados persistidos quedan
// para el Commit 4 o los servicios del PR 6, también para tarifas inactivas.
public class ActualizarTarifaFrecuenciaDto : IValidatableObject
{
    [Range(typeof(long), "1", "9223372036854775807")]
    public required long OrigenRutaParadaId { get; set; }

    [Range(typeof(long), "1", "9223372036854775807")]
    public required long DestinoRutaParadaId { get; set; }

    [Required]
    [Range(typeof(decimal), "0", "99999999.99", ParseLimitsInInvariantCulture = true)]
    public decimal? PrecioBase { get; set; }

    public required bool Activa { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (OrigenRutaParadaId == DestinoRutaParadaId)
        {
            yield return new ValidationResult(
                "El origen y el destino deben ser paradas distintas.",
                new[] { nameof(OrigenRutaParadaId), nameof(DestinoRutaParadaId) });
        }

        if (PrecioBase is decimal precio && decimal.Round(precio, 2) != precio)
        {
            yield return new ValidationResult(
                "El precio base debe tener como máximo dos decimales.",
                new[] { nameof(PrecioBase) });
        }
    }
}
