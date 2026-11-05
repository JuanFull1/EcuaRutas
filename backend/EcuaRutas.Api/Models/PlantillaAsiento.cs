using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class PlantillaAsiento
{
    public long Id { get; set; }

    public long PlantillaId { get; set; }

    public long TipoAsientoId { get; set; }

    public string Numero { get; set; } = null!;

    public short Piso { get; set; }

    public short? Fila { get; set; }

    public short? Columna { get; set; }

    public bool Activo { get; set; }

    public virtual PlantillasBu Plantilla { get; set; } = null!;

    public virtual TiposAsiento TipoAsiento { get; set; } = null!;
}
