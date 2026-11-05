using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs;

public class ActualizarPlantillaBusRequest
{
    [Required(ErrorMessage = "El nombre de la plantilla es obligatorio.")]
    [StringLength(120, ErrorMessage = "El nombre admite máximo 120 caracteres.")]
    public string Nombre { get; set; } = string.Empty;

    public bool TieneBanio { get; set; }
}
