using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class Pago
{
    public long Id { get; set; }

    public long VentaId { get; set; }

    public string Metodo { get; set; } = null!;

    public decimal Monto { get; set; }

    public string? ComprobanteUrl { get; set; }

    public string Estado { get; set; } = null!;

    public long? UsuarioValidadorId { get; set; }

    public string? Observacion { get; set; }

    public DateTime CreadoEn { get; set; }

    public DateTime? ValidadoEn { get; set; }

    public virtual Usuario? UsuarioValidador { get; set; }

    public virtual Venta Venta { get; set; } = null!;
}
