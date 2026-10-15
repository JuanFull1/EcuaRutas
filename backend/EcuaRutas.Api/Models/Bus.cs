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

    [Column("color")]
    public string? Color { get; set; }

    [Column("marca_chasis")]
    public string? MarcaChasis { get; set; }

    [Column("marca_carroceria")]
    public string? MarcaCarroceria { get; set; }

    [Column("modelo")]
    public string? Modelo { get; set; }

    [Column("anio")]
    public int? Anio { get; set; }
}