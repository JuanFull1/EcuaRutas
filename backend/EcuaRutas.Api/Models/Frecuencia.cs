using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class Frecuencia
{
    public long Id { get; set; }

    public long CooperativaId { get; set; }

    public long RutaId { get; set; }

    public long ResolucionAntId { get; set; }

    public string? Codigo { get; set; }

    public TimeOnly HoraSalida { get; set; }

    public bool Activa { get; set; }

    public virtual Cooperativa Cooperativa { get; set; } = null!;

    public virtual ICollection<HojaRutaDetalle> HojaRutaDetalles { get; set; } = new List<HojaRutaDetalle>();

    public virtual ResolucionesAnt ResolucionAnt { get; set; } = null!;

    public virtual Ruta Ruta { get; set; } = null!;

    public virtual ICollection<TarifasFrecuencium> TarifasFrecuencia { get; set; } = new List<TarifasFrecuencium>();

    public virtual ICollection<Viaje> Viajes { get; set; } = new List<Viaje>();
}
