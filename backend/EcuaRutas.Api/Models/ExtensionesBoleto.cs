using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class ExtensionesBoleto
{
    public long Id { get; set; }

    public long VentaAsientoId { get; set; }

    public long DestinoAnteriorId { get; set; }

    public long DestinoNuevoId { get; set; }

    public decimal MontoAdicional { get; set; }

    public string MetodoPago { get; set; } = null!;

    public long UsuarioBusId { get; set; }

    public string? Observacion { get; set; }

    public DateTime CreadoEn { get; set; }

    public virtual RutaParada DestinoAnterior { get; set; } = null!;

    public virtual RutaParada DestinoNuevo { get; set; } = null!;

    public virtual Usuario UsuarioBus { get; set; } = null!;

    public virtual VentaAsiento VentaAsiento { get; set; } = null!;
}
