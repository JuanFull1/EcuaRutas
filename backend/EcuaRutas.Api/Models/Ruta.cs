using System.ComponentModel.DataAnnotations.Schema;

namespace EcuaRutas.Api.Models;

[Table("rutas")]
public class Ruta
{
    [Column("id")]
    public long Id { get; set; }

    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [Column("origen_lugar_id")]
    public long OrigenLugarId { get; set; }

    [Column("destino_lugar_id")]
    public long DestinoLugarId { get; set; }

    [Column("tipo_viaje")]
    public string TipoViaje { get; set; } = string.Empty;

    [Column("activa")]
    public bool Activa { get; set; } = true;
}
