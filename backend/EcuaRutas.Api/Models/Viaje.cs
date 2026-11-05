using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class Viaje
{
    public long Id { get; set; }

    public long? HojaRutaDetalleId { get; set; }

    public long BusId { get; set; }

    public long FrecuenciaId { get; set; }

    public long? UsuarioBusId { get; set; }

    public DateTime SalidaProgramada { get; set; }

    public DateTime? IniciadoEn { get; set; }

    public DateTime? FinalizadoEn { get; set; }

    public string Estado { get; set; } = null!;

    public virtual Bus Bus { get; set; } = null!;

    public virtual Frecuencia Frecuencia { get; set; } = null!;

    public virtual HojaRutaDetalle? HojaRutaDetalle { get; set; }

    public virtual ICollection<OcupacionesAsiento> OcupacionesAsientos { get; set; } = new List<OcupacionesAsiento>();

    public virtual ICollection<PosicionesBu> PosicionesBus { get; set; } = new List<PosicionesBu>();

    public virtual Usuario? UsuarioBus { get; set; }

    public virtual ICollection<ValidacionesBoleto> ValidacionesBoletos { get; set; } = new List<ValidacionesBoleto>();

    public virtual ICollection<Venta> Venta { get; set; } = new List<Venta>();

    public virtual ICollection<VentaAsiento> VentaAsientos { get; set; } = new List<VentaAsiento>();
}
