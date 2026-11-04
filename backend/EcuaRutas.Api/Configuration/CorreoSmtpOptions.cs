
namespace EcuaRutas.Api.Configuration;

public class CorreoSmtpOptions
{
    public const string Seccion = "Correo";

    public bool Habilitado { get; set; } = false;

    public string Servidor { get; set; } = string.Empty;

    public int Puerto { get; set; } = 587;

    public string Usuario { get; set; } = string.Empty;

    public string Clave { get; set; } = string.Empty;

    public string Remitente { get; set; } = string.Empty;

    public string NombreRemitente { get; set; } = "EcuaRutas";
}
