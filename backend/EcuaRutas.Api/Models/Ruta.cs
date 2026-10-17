using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class Ruta
{
    public long Id { get; set; }

    public string Nombre { get; set; } = null!;

    public long OrigenLugarId { get; set; }

    public long DestinoLugarId { get; set; }

    public string TipoViaje { get; set; } = null!;

    public bool Activa { get; set; }

    public virtual Lugare DestinoLugar { get; set; } = null!;

    public virtual ICollection<Frecuencia> Frecuencia { get; set; } = new List<Frecuencia>();

    public virtual Lugare OrigenLugar { get; set; } = null!;

    public virtual ICollection<RutaParada> RutaParada { get; set; } = new List<RutaParada>();
}
