using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class HojasRutum
{
    public long Id { get; set; }

    public long CooperativaId { get; set; }

    public long GrupoBusId { get; set; }

    public DateOnly Fecha { get; set; }

    public string ModoGeneracion { get; set; } = null!;

    public string Estado { get; set; } = null!;

    public DateTime CreadoEn { get; set; }

    public virtual Cooperativa Cooperativa { get; set; } = null!;

    public virtual GruposBuse GrupoBus { get; set; } = null!;

    public virtual ICollection<HojaRutaDetalle> HojaRutaDetalles { get; set; } = new List<HojaRutaDetalle>();
}
