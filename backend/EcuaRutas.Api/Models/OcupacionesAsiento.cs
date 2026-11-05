using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class OcupacionesAsiento
{
    public long Id { get; set; }

    public long VentaAsientoId { get; set; }

    public long ViajeId { get; set; }

    public long AsientoBusId { get; set; }

    public long PasajeroId { get; set; }

    public long ParadaAbordajeId { get; set; }

    public long? ParadaLiberacionId { get; set; }

    public long UsuarioBusAbordajeId { get; set; }

    public long? UsuarioBusLiberacionId { get; set; }

    public string Estado { get; set; } = null!;

    public DateTime AbordadoEn { get; set; }

    public DateTime? LiberadoEn { get; set; }

    public string? Observacion { get; set; }

    public virtual AsientosBu AsientoBus { get; set; } = null!;

    public virtual RutaParada ParadaAbordaje { get; set; } = null!;

    public virtual RutaParada? ParadaLiberacion { get; set; }

    public virtual Pasajero Pasajero { get; set; } = null!;

    public virtual Usuario UsuarioBusAbordaje { get; set; } = null!;

    public virtual Usuario? UsuarioBusLiberacion { get; set; }

    public virtual VentaAsiento VentaAsiento { get; set; } = null!;

    public virtual Viaje Viaje { get; set; } = null!;
}
