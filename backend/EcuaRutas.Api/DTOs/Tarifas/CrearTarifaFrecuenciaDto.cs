using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Tarifas;

// La frecuencia se recibirá por la URL propuesta para el PR 6, no por este cuerpo.
// El alta activa corresponde al servidor (SQL DEFAULT TRUE). La unicidad por
// frecuencia y tramo incluye inactivas; su comprobación requiere persistencia.
public class CrearTarifaFrecuenciaDto : IValidatableObject
{
    [Range(typeof(long), "1", "9223372036854775807")]
    public required long OrigenRutaParadaId { get; set; }

    [Range(typeof(long), "1", "9223372036854775807")]
    public required long DestinoRutaParadaId { get; set; }

    [Required]
    [Range(typeof(decimal), "0", "99999999.99", ParseLimitsInInvariantCulture = true)]
    public decimal? PrecioBase { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (OrigenRutaParadaId == DestinoRutaParadaId)
        {
            yield return new ValidationResult(
                "El origen y el destino deben ser paradas distintas.",
                new[] { nameof(OrigenRutaParadaId), nameof(DestinoRutaParadaId) });
        }

        // Compara sin asignar: no redondea ni convierte un precio ausente en cero.
        if (PrecioBase is decimal precio && decimal.Round(precio, 2) != precio)
        {
            yield return new ValidationResult(
                "El precio base debe tener como máximo dos decimales.",
                new[] { nameof(PrecioBase) });
        }
    }
}
