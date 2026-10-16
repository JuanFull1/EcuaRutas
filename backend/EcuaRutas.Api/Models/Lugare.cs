using System;
using System.Collections.Generic;
using NetTopologySuite.Geometries;

namespace EcuaRutas.Api.Models;

public partial class Lugare
{
    public long Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Provincia { get; set; }

    public string? Canton { get; set; }

    public string Tipo { get; set; } = null!;

    public Point? Ubicacion { get; set; }

    public bool Activo { get; set; }

    public virtual ICollection<Ruta> RutaDestinoLugars { get; set; } = new List<Ruta>();

    public virtual ICollection<Ruta> RutaOrigenLugars { get; set; } = new List<Ruta>();

    public virtual ICollection<RutaParada> RutaParada { get; set; } = new List<RutaParada>();
}
