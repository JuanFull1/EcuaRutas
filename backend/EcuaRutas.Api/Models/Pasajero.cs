using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class Pasajero
{
    public long Id { get; set; }

    public long? UsuarioId { get; set; }

    public string TipoDocumento { get; set; } = null!;

    public string Documento { get; set; } = null!;

    public string Nombres { get; set; } = null!;

    public string Apellidos { get; set; } = null!;

    public string? Correo { get; set; }

    public string? Telefono { get; set; }

    public DateOnly? FechaNacimiento { get; set; }

    public bool Discapacidad { get; set; }

    public string? CarnetConadis { get; set; }

    public DateTime CreadoEn { get; set; }

    public virtual ICollection<OcupacionesAsiento> OcupacionesAsientos { get; set; } = new List<OcupacionesAsiento>();

    public virtual Usuario? Usuario { get; set; }

    public virtual ICollection<VentaAsiento> VentaAsientos { get; set; } = new List<VentaAsiento>();
}
