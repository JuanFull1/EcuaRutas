using System.ComponentModel.DataAnnotations.Schema;

namespace EcuaRutas.Api.Models;

[Table("grupos_buses")]
public class GrupoBus
{
    [Column("id")]
    public long Id { get; set; }

    [Column("cooperativa_id")]
    public long CooperativaId { get; set; }

    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;
}