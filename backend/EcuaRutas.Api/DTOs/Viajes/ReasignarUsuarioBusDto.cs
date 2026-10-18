using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Viajes;

public class ReasignarUsuarioBusDto
{
    // El service verifica que el usuario tenga rol BUS y pertenezca a la cooperativa del viaje.
    [Range(1, long.MaxValue)]
    public long UsuarioBusId { get; set; }
}