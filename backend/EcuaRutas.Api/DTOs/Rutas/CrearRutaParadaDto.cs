using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Rutas;

// Los identificadores de la ruta se reciben por la URL.
public class CrearRutaParadaDto : IValidatableObject
{
    [Range(typeof(long), "1", "9223372036854775807")]
    public required long LugarId { get; set; }

    [Range(0, int.MaxValue)]
    public required int Orden { get; set; }

    [Range(typeof(decimal), "-99999999.99", "99999999.99", ParseLimitsInInvariantCulture = true)]
    public decimal? KmAcumulado { get; set; }

    public int? MinutosAcumulados { get; set; }

    public required bool PermiteAscenso { get; set; }

    public required bool PermiteDescenso { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (KmAcumulado is decimal km && decimal.Round(km, 2) != km)
        {
            yield return new ValidationResult(
                "Los kilómetros acumulados deben tener como máximo dos decimales.",
                new[] { nameof(KmAcumulado) });
        }
    }
}
