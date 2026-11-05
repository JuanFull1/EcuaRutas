using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class GruposBuse
{
    public long Id { get; set; }

    public long CooperativaId { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Descripcion { get; set; }

    public bool Activo { get; set; }

    public virtual ICollection<Bus> Buses { get; set; } = new List<Bus>();

    public virtual Cooperativa Cooperativa { get; set; } = null!;

    public virtual ICollection<HojasRutum> HojasRuta { get; set; } = new List<HojasRutum>();
}
