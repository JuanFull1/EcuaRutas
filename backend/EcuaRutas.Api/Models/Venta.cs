using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class Venta
{
    public long Id { get; set; }

    public string Codigo { get; set; } = null!;

    public long ViajeId { get; set; }

    public long? UsuarioClienteId { get; set; }

    public long? UsuarioVendedorId { get; set; }

    public string Canal { get; set; } = null!;

    public string Estado { get; set; } = null!;

    public decimal Subtotal { get; set; }

    public decimal DescuentoTotal { get; set; }

    public decimal Total { get; set; }

    public DateTime? ExpiraEn { get; set; }

    public DateTime CreadoEn { get; set; }

    public DateTime ActualizadoEn { get; set; }

    public virtual ICollection<Notificacione> Notificaciones { get; set; } = new List<Notificacione>();

    public virtual ICollection<Pago> Pagos { get; set; } = new List<Pago>();

    public virtual Usuario? UsuarioCliente { get; set; }

    public virtual Usuario? UsuarioVendedor { get; set; }

    public virtual ICollection<VentaAsiento> VentaAsientos { get; set; } = new List<VentaAsiento>();

    public virtual Viaje Viaje { get; set; } = null!;
}
