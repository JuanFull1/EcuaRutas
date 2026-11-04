using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.OperacionBus;

public class LiberarAsientoDto
{
    // Parada (ruta_paradas.id) donde el pasajero descendió; el service verifica que sea de la ruta del viaje.
    [Range(1, long.MaxValue, ErrorMessage = "La parada de liberación es obligatoria y debe ser un identificador válido.")]
    public long ParadaLiberacionId { get; set; }

    [StringLength(500, ErrorMessage = "La observación no puede superar {1} caracteres.")]
    public string? Observacion { get; set; }
}