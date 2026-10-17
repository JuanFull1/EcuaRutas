using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class TarifasFrecuencium
{
    public long Id { get; set; }

    public long FrecuenciaId { get; set; }

    public long OrigenRutaParadaId { get; set; }

    public long DestinoRutaParadaId { get; set; }

    public decimal PrecioBase { get; set; }

    public bool Activa { get; set; }

    public virtual RutaParada DestinoRutaParada { get; set; } = null!;

    public virtual Frecuencia Frecuencia { get; set; } = null!;

    public virtual RutaParada OrigenRutaParada { get; set; } = null!;
}
