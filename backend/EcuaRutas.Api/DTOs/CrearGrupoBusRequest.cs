using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs;

public class CrearGrupoBusRequest
{
    [Range(1, long.MaxValue, ErrorMessage = "La cooperativa es obligatoria.")]
    public long CooperativaId { get; set; }

    [Required(ErrorMessage = "El nombre del grupo es obligatorio.")]
    [StringLength(100, ErrorMessage = "El nombre admite máximo 100 caracteres.")]
    public string Nombre { get; set; } = string.Empty;

    public string? Descripcion { get; set; }
}