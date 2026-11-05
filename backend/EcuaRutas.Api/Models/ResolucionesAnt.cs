using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class ResolucionesAnt
{
    public long Id { get; set; }

    public long CooperativaId { get; set; }

    public string NumeroResolucion { get; set; } = null!;

    public DateOnly? FechaResolucion { get; set; }

    public string? ArchivoUrl { get; set; }

    public bool Activa { get; set; }

    public virtual Cooperativa Cooperativa { get; set; } = null!;

    public virtual ICollection<Frecuencia> Frecuencia { get; set; } = new List<Frecuencia>();
}
