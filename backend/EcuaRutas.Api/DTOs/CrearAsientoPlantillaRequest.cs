using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs;

public class CrearAsientoPlantillaRequest
{
    [Range(1, long.MaxValue, ErrorMessage = "El tipo de asiento es obligatorio.")]
    public long TipoAsientoId { get; set; }

    [Required(ErrorMessage = "El número del asiento es obligatorio.")]
    [StringLength(10, ErrorMessage = "El número admite máximo 10 caracteres.")]
    public string Numero { get; set; } = string.Empty;

    [Range(1, 2, ErrorMessage = "El piso debe ser 1 o 2.")]
    public int Piso { get; set; } = 1;

    [Required(ErrorMessage = "La fila es obligatoria.")]
    [Range(1, 50, ErrorMessage = "La fila debe estar entre 1 y 50.")]
    public int? Fila { get; set; }

    [Required(ErrorMessage = "La columna es obligatoria.")]
    [Range(1, 10, ErrorMessage = "La columna debe estar entre 1 y 10.")]
    public int? Columna { get; set; }
}