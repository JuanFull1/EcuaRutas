using System.ComponentModel.DataAnnotations.Schema;

namespace EcuaRutas.Api.Models;

[Table("buses")]
public class Bus
{
    [Column("id")]
    public long Id { get; set; }

    [Column("cooperativa_id")]
    public long CooperativaId { get; set; }

    [Column("numero_interno")]
    public string NumeroInterno { get; set; } = string.Empty;

    [Column("placa")]
    public string Placa { get; set; } = string.Empty;
}