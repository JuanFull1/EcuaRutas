using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class Boleto
{
    public long Id { get; set; }

    public long VentaAsientoId { get; set; }

    public string CodigoBoleto { get; set; } = null!;

    public string QrToken { get; set; } = null!;

    public string? ArchivoUrl { get; set; }

    public string Estado { get; set; } = null!;

    public DateTime GeneradoEn { get; set; }

    public virtual ICollection<ValidacionesBoleto> ValidacionesBoletos { get; set; } = new List<ValidacionesBoleto>();

    public virtual VentaAsiento VentaAsiento { get; set; } = null!;
}
