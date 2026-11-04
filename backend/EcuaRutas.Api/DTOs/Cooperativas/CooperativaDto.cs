namespace EcuaRutas.Api.DTOs.Cooperativas;

public class CooperativaDto
{
    public long Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string? Ruc { get; set; }

    public string? Descripcion { get; set; }

    public string? Telefono { get; set; }

    public string? Correo { get; set; }

    public string? Direccion { get; set; }

    public string? LogoUrl { get; set; }

    public string? ColorPrimario { get; set; }

    public string? ColorSecundario { get; set; }

    public string RedesSociales { get; set; } = "{}";

    public string? InformacionSoporte { get; set; }

    public bool Activa { get; set; }

    public int CantidadUsuarios { get; set; }

    public DateTime CreadoEn { get; set; }
}