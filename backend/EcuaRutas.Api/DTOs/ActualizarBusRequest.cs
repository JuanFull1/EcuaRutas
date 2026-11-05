using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs;

public class ActualizarBusRequest
{
    public long? GrupoBusId { get; set; }

    public long? PlantillaId { get; set; }

    [Required(ErrorMessage = "El número interno es obligatorio.")]
    [StringLength(30, ErrorMessage = "El número interno admite máximo 30 caracteres.")]
    public string NumeroInterno { get; set; } = string.Empty;

    [Required(ErrorMessage = "La placa es obligatoria.")]
    [StringLength(20, ErrorMessage = "La placa admite máximo 20 caracteres.")]
    public string Placa { get; set; } = string.Empty;

    [StringLength(50)]
    public string? Color { get; set; }

    [StringLength(100)]
    public string? MarcaChasis { get; set; }

    [StringLength(100)]
    public string? MarcaCarroceria { get; set; }

    [StringLength(100)]
    public string? Modelo { get; set; }

    [Range(1900, 2100, ErrorMessage = "El año no es válido.")]
    public int? Anio { get; set; }

    [Range(1, 2, ErrorMessage = "Los pisos deben ser 1 o 2.")]
    public int Pisos { get; set; } = 1;

    [Range(1, 32767, ErrorMessage = "La capacidad debe ser mayor a 0.")]
    public int Capacidad { get; set; }

    public bool TieneBanio { get; set; }

    [StringLength(500)]
    public string? FotoUrl { get; set; }

    [Required(ErrorMessage = "El estado es obligatorio.")]
    [RegularExpression("^(ACTIVO|MANTENIMIENTO|INACTIVO)$",
        ErrorMessage = "El estado debe ser ACTIVO, MANTENIMIENTO o INACTIVO.")]
    public string Estado { get; set; } = "ACTIVO";
}