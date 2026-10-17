using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class ValidacionesBoleto
{
    public long Id { get; set; }

    public long BoletoId { get; set; }

    public long ViajeId { get; set; }

    public long UsuarioBusId { get; set; }

    public string Resultado { get; set; } = null!;

    public string? Observacion { get; set; }

    public DateTime ValidadoEn { get; set; }

    public virtual Boleto Boleto { get; set; } = null!;

    public virtual Usuario UsuarioBus { get; set; } = null!;

    public virtual Viaje Viaje { get; set; } = null!;
}
