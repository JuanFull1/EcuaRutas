
using System.Net;
using System.Net.Mail;
using EcuaRutas.Api.Configuration;
using Microsoft.Extensions.Options;

namespace EcuaRutas.Api.Services;

public class CorreoSmtpService
{
    private readonly CorreoSmtpOptions _opciones;
    private readonly ILogger<CorreoSmtpService> _logger;

    public CorreoSmtpService(
        IOptions<CorreoSmtpOptions> opciones,
        ILogger<CorreoSmtpService> logger)
    {
        _opciones = opciones.Value;
        _logger = logger;
    }

    public async Task EnviarAsync(
        string destinatario,
        string asunto,
        string contenido,
        CancellationToken cancellationToken = default)
    {
        if (!_opciones.Habilitado)
        {
            throw new InvalidOperationException(
                "El envío de correos está deshabilitado.");
        }

        if (string.IsNullOrWhiteSpace(_opciones.Servidor) ||
            string.IsNullOrWhiteSpace(_opciones.Usuario) ||
            string.IsNullOrWhiteSpace(_opciones.Clave) ||
            string.IsNullOrWhiteSpace(_opciones.Remitente))
        {
            throw new InvalidOperationException(
                "La configuración SMTP está incompleta.");
        }

        if (_opciones.Puerto < 1 ||
            _opciones.Puerto > 65535)
        {
            throw new InvalidOperationException(
                "El puerto SMTP no es válido.");
        }

        if (string.IsNullOrWhiteSpace(destinatario) ||
            string.IsNullOrWhiteSpace(asunto) ||
            string.IsNullOrWhiteSpace(contenido))
        {
            throw new ArgumentException(
                "El destinatario, asunto y contenido son obligatorios.");
        }

        using var mensaje = new MailMessage
        {
            From = new MailAddress(
                _opciones.Remitente,
                _opciones.NombreRemitente),
            Subject = asunto,
            Body = contenido,
            IsBodyHtml = false
        };

        mensaje.To.Add(new MailAddress(destinatario));

        using var cliente = new SmtpClient(
            _opciones.Servidor,
            _opciones.Puerto)
        {
            EnableSsl = true,
            UseDefaultCredentials = false,
            Credentials = new NetworkCredential(
                _opciones.Usuario,
                _opciones.Clave),
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Timeout = 15000
        };

        await cliente.SendMailAsync(
            mensaje,
            cancellationToken);

        _logger.LogInformation(
            "Correo aceptado por SMTP para la notificación enviada.");
    }
}
