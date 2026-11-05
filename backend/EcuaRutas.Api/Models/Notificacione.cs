using System;
using System.Collections.Generic;

namespace EcuaRutas.Api.Models;

public partial class Notificacione
{
    public long Id { get; set; }

    public long? UsuarioId { get; set; }

    public long? VentaId { get; set; }

    public string CorreoDestino { get; set; } = null!;

    public string Tipo { get; set; } = null!;

    public string Asunto { get; set; } = null!;

    public string Estado { get; set; } = null!;

    public DateTime CreadoEn { get; set; }

    public DateTime? EnviadoEn { get; set; }

    public virtual Usuario? Usuario { get; set; }

    public virtual Venta? Venta { get; set; }
}
