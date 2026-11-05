using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs;

public class ActualizarGrupoBusRequest
{
    [Required(ErrorMessage = "El nombre del grupo es obligatorio.")]
    [StringLength(100, ErrorMessage = "El nombre admite máximo 100 caracteres.")]
    public string Nombre { get; set; } = string.Empty;

    public string? Descripcion { get; set; }

    public bool Activo { get; set; } = true;
}