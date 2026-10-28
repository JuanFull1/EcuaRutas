using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Rutas;

public class CrearRutaDto : IValidatableObject
{
    [Required]
    [StringLength(200)]
    public string Nombre { get; set; } = string.Empty;

    [Range(typeof(long), "1", "9223372036854775807")]
    public required long OrigenLugarId { get; set; }

    [Range(typeof(long), "1", "9223372036854775807")]
    public required long DestinoLugarId { get; set; }

    [Required]
    [StringLength(30)]
    [RegularExpression("^(DIRECTO|CON_PARADAS)$")]
    public string TipoViaje { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (OrigenLugarId == DestinoLugarId)
        {
            yield return new ValidationResult(
                "El origen y el destino deben ser lugares distintos.",
                new[] { nameof(OrigenLugarId), nameof(DestinoLugarId) });
        }
    }
}
