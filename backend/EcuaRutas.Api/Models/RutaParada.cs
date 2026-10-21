using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class RutaParada
{
    public long Id { get; set; }

    public long RutaId { get; set; }

    public long LugarId { get; set; }

    public int Orden { get; set; }

    public decimal? KmAcumulado { get; set; }

    public int? MinutosAcumulados { get; set; }

    public bool PermiteAscenso { get; set; }

    public bool PermiteDescenso { get; set; }

    public virtual ICollection<ExtensionesBoleto> ExtensionesBoletoDestinoAnteriors { get; set; } = new List<ExtensionesBoleto>();

    public virtual ICollection<ExtensionesBoleto> ExtensionesBoletoDestinoNuevos { get; set; } = new List<ExtensionesBoleto>();

    public virtual Lugare Lugar { get; set; } = null!;

    public virtual ICollection<OcupacionesAsiento> OcupacionesAsientoParadaAbordajes { get; set; } = new List<OcupacionesAsiento>();

    public virtual ICollection<OcupacionesAsiento> OcupacionesAsientoParadaLiberacions { get; set; } = new List<OcupacionesAsiento>();

    public virtual Ruta Ruta { get; set; } = null!;

    public virtual ICollection<TarifasFrecuencium> TarifasFrecuenciumDestinoRutaParada { get; set; } = new List<TarifasFrecuencium>();

    public virtual ICollection<TarifasFrecuencium> TarifasFrecuenciumOrigenRutaParada { get; set; } = new List<TarifasFrecuencium>();

    public virtual ICollection<VentaAsiento> VentaAsientoDestinoRutaParada { get; set; } = new List<VentaAsiento>();

    public virtual ICollection<VentaAsiento> VentaAsientoOrigenRutaParada { get; set; } = new List<VentaAsiento>();
}
