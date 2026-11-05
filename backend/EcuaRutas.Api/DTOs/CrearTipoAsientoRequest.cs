using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs;

public class CrearTipoAsientoRequest
{
    /// <summary>Nulo para un tipo general (solo ADMIN).</summary>
    public long? CooperativaId { get; set; }

    [Required(ErrorMessage = "El nombre del tipo de asiento es obligatorio.")]
    [StringLength(80, ErrorMessage = "El nombre admite máximo 80 caracteres.")]
    public string Nombre { get; set; } = string.Empty;

    [Range(typeof(decimal), "0", "100", ErrorMessage = "El recargo debe estar entre 0 y 100 %.")]
    public decimal RecargoPorcentaje { get; set; }
}
