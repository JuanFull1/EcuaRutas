using System;
using System.Collections.Generic;
using NetTopologySuite.Geometries;

namespace EcuaRutas.Api.Models;

public partial class PosicionesBu
{
    public long Id { get; set; }

    public long ViajeId { get; set; }

    public long BusId { get; set; }

    public Point Ubicacion { get; set; } = null!;

    public decimal? VelocidadKmh { get; set; }

    public decimal? PrecisionMetros { get; set; }

    public DateTime RegistradoEn { get; set; }

    public virtual Bus Bus { get; set; } = null!;

    public virtual Viaje Viaje { get; set; } = null!;
}
