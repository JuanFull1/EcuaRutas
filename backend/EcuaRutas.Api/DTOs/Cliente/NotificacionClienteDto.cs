
namespace EcuaRutas.Api.DTOs.Cliente;

public class NotificacionClienteDto
{
    public long Id { get; set; }

    public long? VentaId { get; set; }

    public string Tipo { get; set; } = string.Empty;

    public string Asunto { get; set; } = string.Empty;

    public string Estado { get; set; } = string.Empty;

    public DateTime CreadoEn { get; set; }

    public DateTime? EnviadoEn { get; set; }
}
