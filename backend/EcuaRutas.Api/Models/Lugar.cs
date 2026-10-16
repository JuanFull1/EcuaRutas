using System.ComponentModel.DataAnnotations.Schema;
using NetTopologySuite.Geometries;

namespace EcuaRutas.Api.Models;

[Table("lugares")]
public class Lugar
{
    [Column("id")]
    public long Id { get; set; }

    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [Column("provincia")]
    public string? Provincia { get; set; }

    [Column("canton")]
    public string? Canton { get; set; }

    [Column("tipo")]
    public string Tipo { get; set; } = string.Empty;

    [Column("ubicacion", TypeName = "geography (point, 4326)")]
    public Point? Ubicacion { get; set; }

    [Column("activo")]
    public bool Activo { get; set; } = true;
}
