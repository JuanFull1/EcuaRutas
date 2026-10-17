using System.ComponentModel.DataAnnotations;

namespace EcuaRutas.Api.DTOs.Rutas;

public class LugarDto
{
    public long Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string? Provincia { get; set; }

    public string? Canton { get; set; }

    public string Tipo { get; set; } = string.Empty;

    public CoordenadasDto? Ubicacion { get; set; }

    public bool Activo { get; set; }
}

// Contrato compartido de ubicacion: grados decimales WGS84 (SRID 4326).
// Ubicacion puede ser null; si se envia, ambas coordenadas son obligatorias.
// MapLibre consume el par [Longitud, Latitud]. La conversion a Point queda pendiente.
public class CoordenadasDto
{
    [Range(-90d, 90d)]
    public required double Latitud { get; set; }

    [Range(-180d, 180d)]
    public required double Longitud { get; set; }
}
