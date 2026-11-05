using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class Role
{
    public long Id { get; set; }

    public string Codigo { get; set; } = null!;

    public string Nombre { get; set; } = null!;

    public virtual ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();
}
