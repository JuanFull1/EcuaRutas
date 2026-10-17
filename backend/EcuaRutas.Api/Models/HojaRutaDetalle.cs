using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class HojaRutaDetalle
{
    public long Id { get; set; }

    public long HojaRutaId { get; set; }

    public long BusId { get; set; }

    public long? FrecuenciaId { get; set; }

    public string TipoAsignacion { get; set; } = null!;

    public int OrdenDia { get; set; }

    public TimeOnly? HoraProgramada { get; set; }

    public string? Observacion { get; set; }

    public virtual Bus Bus { get; set; } = null!;

    public virtual Frecuencia? Frecuencia { get; set; }

    public virtual HojasRutum HojaRuta { get; set; } = null!;

    public virtual Viaje? Viaje { get; set; }
}
