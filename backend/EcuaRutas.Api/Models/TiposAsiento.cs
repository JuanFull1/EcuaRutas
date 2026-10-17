using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class TiposAsiento
{
    public long Id { get; set; }

    public long? CooperativaId { get; set; }

    public string Nombre { get; set; } = null!;

    public decimal RecargoPorcentaje { get; set; }

    public bool Activo { get; set; }

    public virtual ICollection<AsientosBu> AsientosBus { get; set; } = new List<AsientosBu>();

    public virtual Cooperativa? Cooperativa { get; set; }

    public virtual ICollection<PlantillaAsiento> PlantillaAsientos { get; set; } = new List<PlantillaAsiento>();
}
