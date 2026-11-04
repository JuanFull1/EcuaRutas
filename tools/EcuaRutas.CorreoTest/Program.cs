
using EcuaRutas.Api.Configuration;
using EcuaRutas.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

// Leer los secretos existentes del backend.
var configuracion = new ConfigurationBuilder()
    .AddUserSecrets(
        typeof(CorreoSmtpOptions).Assembly,
        optional: false)
    .Build();

var opciones = configuracion
    .GetSection(CorreoSmtpOptions.Seccion)
    .Get<CorreoSmtpOptions>();

if (opciones == null ||
    string.IsNullOrWhiteSpace(opciones.Servidor) ||
    string.IsNullOrWhiteSpace(opciones.Usuario) ||
    string.IsNullOrWhiteSpace(opciones.Clave) ||
    string.IsNullOrWhiteSpace(opciones.Remitente))
{
    Console.WriteLine(
        "ERROR: La configuración SMTP está incompleta.");

    return;
}

// Habilitar solo esta prueba individual.
// No modifica User Secrets.
opciones.Habilitado = true;

// Enviar únicamente a la misma cuenta configurada.
var destinatario = opciones.Usuario;

Console.WriteLine("PRUEBA DE CORREO - ECUARUTAS");
Console.WriteLine("---------------------------");
Console.WriteLine("Se enviará un único mensaje al Gmail remitente.");
Console.WriteLine("No se consultará PostgreSQL.");
Console.WriteLine();

Console.Write("¿Enviar correo de prueba? (S/N): ");
var respuesta = Console.ReadLine();

if (!string.Equals(
    respuesta?.Trim(),
    "S",
    StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine("Prueba cancelada.");
    return;
}

var servicio = new CorreoSmtpService(
    Options.Create(opciones),
    NullLogger<CorreoSmtpService>.Instance);

try
{
    await servicio.EnviarAsync(
        destinatario,
        "Prueba de notificaciones - EcuaRutas",
        "Hola. Este es un mensaje de prueba del sistema EcuaRutas.\n\n" +
        "El servicio SMTP está funcionando correctamente si has recibido este mensaje.");

    Console.WriteLine();
    Console.WriteLine(
        "ÉXITO: Gmail aceptó el mensaje de prueba.");
}
catch (Exception ex)
{
    Console.WriteLine();
    Console.WriteLine("ERROR: No se pudo enviar el correo.");
    Console.WriteLine($"Tipo de error: {ex.GetType().Name}");

    // No mostrar secretos ni datos de configuración.
    Console.WriteLine(
        "Revisa la contraseña de aplicación y la conexión SMTP.");
}
