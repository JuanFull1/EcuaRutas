using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class Bus
{
    public long Id { get; set; }

    public long CooperativaId { get; set; }

    public long? GrupoBusId { get; set; }

    public long? PlantillaId { get; set; }

    public string NumeroInterno { get; set; } = null!;

    public string Placa { get; set; } = null!;

    public string? Color { get; set; }

    public string? MarcaChasis { get; set; }

    public string? MarcaCarroceria { get; set; }

    public string? Modelo { get; set; }

    public short? Anio { get; set; }

    public short Pisos { get; set; }

    public short Capacidad { get; set; }

    public bool TieneBanio { get; set; }

    public string? FotoUrl { get; set; }

    public string Estado { get; set; } = null!;

    public DateTime CreadoEn { get; set; }

    public virtual ICollection<AsientosBu> AsientosBus { get; set; } = new List<AsientosBu>();

    public virtual Cooperativa Cooperativa { get; set; } = null!;

    public virtual GruposBuse? GrupoBus { get; set; }

    public virtual ICollection<HojaRutaDetalle> HojaRutaDetalles { get; set; } = new List<HojaRutaDetalle>();

    public virtual PlantillasBu? Plantilla { get; set; }

    public virtual ICollection<PosicionesBu> PosicionesBus { get; set; } = new List<PosicionesBu>();

    public virtual ICollection<Viaje> Viajes { get; set; } = new List<Viaje>();
}
