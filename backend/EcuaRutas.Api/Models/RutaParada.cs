using System.ComponentModel.DataAnnotations.Schema;

namespace EcuaRutas.Api.Models;

[Table("ruta_paradas")]
public class RutaParada
{
    [Column("id")]
    public long Id { get; set; }

    [Column("ruta_id")]
    public long RutaId { get; set; }

    [Column("lugar_id")]
    public long LugarId { get; set; }

    [Column("orden")]
    public int Orden { get; set; }

    [Column("km_acumulado", TypeName = "numeric(10,2)")]
    public decimal? KmAcumulado { get; set; }

    [Column("minutos_acumulados")]
    public int? MinutosAcumulados { get; set; }

    [Column("permite_ascenso")]
    public bool PermiteAscenso { get; set; } = true;

    [Column("permite_descenso")]
    public bool PermiteDescenso { get; set; } = true;
}
