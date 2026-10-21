using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class Cooperativa
{
    public long Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Ruc { get; set; }

    public string? Descripcion { get; set; }

    public string? Telefono { get; set; }

    public string? Correo { get; set; }

    public string? Direccion { get; set; }

    public string? LogoUrl { get; set; }

    public string? ColorPrimario { get; set; }

    public string? ColorSecundario { get; set; }

    public string RedesSociales { get; set; } = null!;

    public string? InformacionSoporte { get; set; }

    public bool Activa { get; set; }

    public DateTime CreadoEn { get; set; }

    public virtual ICollection<Bus> Buses { get; set; } = new List<Bus>();

    public virtual ICollection<Frecuencia> Frecuencia { get; set; } = new List<Frecuencia>();

    public virtual ICollection<GruposBuse> GruposBuses { get; set; } = new List<GruposBuse>();

    public virtual ICollection<HojasRutum> HojasRuta { get; set; } = new List<HojasRutum>();

    public virtual ICollection<PlantillasBu> PlantillasBus { get; set; } = new List<PlantillasBu>();

    public virtual ICollection<ResolucionesAnt> ResolucionesAnts { get; set; } = new List<ResolucionesAnt>();

    public virtual ICollection<TiposAsiento> TiposAsientos { get; set; } = new List<TiposAsiento>();

    public virtual ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();
}
