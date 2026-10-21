using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class PlantillasBu
{
    public long Id { get; set; }

    public long? CooperativaId { get; set; }

    public string Nombre { get; set; } = null!;

    public short Pisos { get; set; }

    public bool TieneBanio { get; set; }

    public bool Activa { get; set; }

    public virtual ICollection<Bus> Buses { get; set; } = new List<Bus>();

    public virtual Cooperativa? Cooperativa { get; set; }

    public virtual ICollection<PlantillaAsiento> PlantillaAsientos { get; set; } = new List<PlantillaAsiento>();
}
