using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class AsientosBu
{
    public long Id { get; set; }

    public long BusId { get; set; }

    public long TipoAsientoId { get; set; }

    public string Numero { get; set; } = null!;

    public short Piso { get; set; }

    public short? Fila { get; set; }

    public short? Columna { get; set; }

    public bool Activo { get; set; }

    public virtual Bus Bus { get; set; } = null!;

    public virtual ICollection<OcupacionesAsiento> OcupacionesAsientos { get; set; } = new List<OcupacionesAsiento>();

    public virtual TiposAsiento TipoAsiento { get; set; } = null!;

    public virtual ICollection<VentaAsiento> VentaAsientos { get; set; } = new List<VentaAsiento>();
}
