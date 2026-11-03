
using System;
using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Cliente;

public class BuscarViajesClienteDto
{
    [Required(ErrorMessage = "El origen es obligatorio.")]
    [Range(1, long.MaxValue)]
    public long? OrigenLugarId { get; set; }

    [Required(ErrorMessage = "El destino es obligatorio.")]
    [Range(1, long.MaxValue)]
    public long? DestinoLugarId { get; set; }

    [Required(ErrorMessage = "La fecha es obligatoria.")]
    public DateTime? Fecha { get; set; }

    public long? CooperativaId { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? PrecioMaximo { get; set; }

    public string? TipoAsiento { get; set; }
}
