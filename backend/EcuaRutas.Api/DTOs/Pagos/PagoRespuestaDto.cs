
namespace EcuaRutas.Api.DTOs.Pagos;

public class PagoRespuestaDto
{
    public long Id { get; set; }

    public long VentaId { get; set; }

    public string Metodo { get; set; } = string.Empty;

    public decimal Monto { get; set; }

    public string Estado { get; set; } = string.Empty;

    public DateTime CreadoEn { get; set; }
}
