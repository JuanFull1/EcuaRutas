using System;
using System.Collections.Generic;
using NpgsqlTypes;

namespace EcuaRutas.Api.Models;

public partial class VentaAsiento
{
    public long Id { get; set; }

    public long VentaId { get; set; }

    public long ViajeId { get; set; }

    public long PasajeroId { get; set; }

    public long AsientoBusId { get; set; }

    public long OrigenRutaParadaId { get; set; }

    public long DestinoRutaParadaId { get; set; }

    public int OrdenOrigen { get; set; }

    public int OrdenDestino { get; set; }

    public NpgsqlRange<int>? TramoPlanificado { get; set; }

    public decimal PrecioBase { get; set; }

    public decimal RecargoAsiento { get; set; }

    public string TipoDescuento { get; set; } = null!;

    public decimal PorcentajeDescuento { get; set; }

    public decimal ValorDescuento { get; set; }

    public decimal PrecioFinal { get; set; }

    public string EstadoAsiento { get; set; } = null!;

    public DateTime CreadoEn { get; set; }

    public virtual AsientosBu AsientoBus { get; set; } = null!;

    public virtual Boleto? Boleto { get; set; }

    public virtual RutaParada DestinoRutaParada { get; set; } = null!;

    public virtual ICollection<ExtensionesBoleto> ExtensionesBoletos { get; set; } = new List<ExtensionesBoleto>();

    public virtual ICollection<OcupacionesAsiento> OcupacionesAsientos { get; set; } = new List<OcupacionesAsiento>();

    public virtual RutaParada OrigenRutaParada { get; set; } = null!;

    public virtual Pasajero Pasajero { get; set; } = null!;

    public virtual Venta Venta { get; set; } = null!;

    public virtual Viaje Viaje { get; set; } = null!;
}
