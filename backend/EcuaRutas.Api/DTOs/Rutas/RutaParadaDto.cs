namespace EcuaRutas.Api.DTOs.Rutas;

public class RutaParadaDto
{
    public long Id { get; set; }

    public long RutaId { get; set; }

    public long LugarId { get; set; }

    public int Orden { get; set; }

    public decimal? KmAcumulado { get; set; }

    public int? MinutosAcumulados { get; set; }

    public bool PermiteAscenso { get; set; }

    public bool PermiteDescenso { get; set; }
}
