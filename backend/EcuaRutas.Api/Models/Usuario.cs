using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class Usuario
{
    public long Id { get; set; }

    public long RolId { get; set; }

    public long? CooperativaId { get; set; }

    public string? Cedula { get; set; }

    public string Nombres { get; set; } = null!;

    public string Apellidos { get; set; } = null!;

    public string Correo { get; set; } = null!;

    public string? Telefono { get; set; }

    public string PasswordHash { get; set; } = null!;

    public bool Activo { get; set; }

    public DateTime CreadoEn { get; set; }

    public DateTime ActualizadoEn { get; set; }

    public virtual Cooperativa? Cooperativa { get; set; }

    public virtual ICollection<ExtensionesBoleto> ExtensionesBoletos { get; set; } = new List<ExtensionesBoleto>();

    public virtual ICollection<Notificacione> Notificaciones { get; set; } = new List<Notificacione>();

    public virtual ICollection<OcupacionesAsiento> OcupacionesAsientoUsuarioBusAbordajes { get; set; } = new List<OcupacionesAsiento>();

    public virtual ICollection<OcupacionesAsiento> OcupacionesAsientoUsuarioBusLiberacions { get; set; } = new List<OcupacionesAsiento>();

    public virtual ICollection<Pago> Pagos { get; set; } = new List<Pago>();

    public virtual Pasajero? Pasajero { get; set; }

    public virtual Role Rol { get; set; } = null!;

    public virtual ICollection<ValidacionesBoleto> ValidacionesBoletos { get; set; } = new List<ValidacionesBoleto>();

    public virtual ICollection<Venta> VentaUsuarioClientes { get; set; } = new List<Venta>();

    public virtual ICollection<Venta> VentaUsuarioVendedors { get; set; } = new List<Venta>();

    public virtual ICollection<Viaje> Viajes { get; set; } = new List<Viaje>();
}
