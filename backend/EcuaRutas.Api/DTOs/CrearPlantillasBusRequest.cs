using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs;

public class CrearPlantillaBusRequest
{
    public long? CooperativaId { get; set; }

    [Required(ErrorMessage = "El nombre de la plantilla es obligatorio.")]
    [StringLength(120, ErrorMessage = "El nombre admite máximo 120 caracteres.")]
    public string Nombre { get; set; } = string.Empty;

    [Range(1, 2, ErrorMessage = "Los pisos deben ser 1 o 2.")]
    public int Pisos { get; set; } = 1;

    public bool TieneBanio { get; set; }
}