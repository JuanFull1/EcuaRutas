
using EcuaRutas.Api.Configuration;
using EcuaRutas.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace EcuaRutas.Api.Services;

public class NotificacionesCorreoWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<CorreoSmtpOptions> _opciones;
    private readonly ILogger<NotificacionesCorreoWorker> _logger;

    public NotificacionesCorreoWorker(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<CorreoSmtpOptions> opciones,
        ILogger<NotificacionesCorreoWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _opciones = opciones;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        using var temporizador = new PeriodicTimer(
            TimeSpan.FromMinutes(1));

        try
        {
            do
            {
                if (_opciones.CurrentValue.Habilitado)
                {
                    try
                    {
                        await ProcesarPendientesAsync(stoppingToken);
                    }
                    catch (OperationCanceledException)
                        when (stoppingToken.IsCancellationRequested)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(
                            ex,
                            "Error general en el procesamiento de correos.");
                    }
                }
            }
            while (await temporizador.WaitForNextTickAsync(
                stoppingToken));
        }
        catch (OperationCanceledException)
            when (stoppingToken.IsCancellationRequested)
        {
            // Detención normal de la aplicación.
        }
    }

    private async Task ProcesarPendientesAsync(
        CancellationToken cancellationToken)
    {
        List<long> identificadores;

        using (var scope = _scopeFactory.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<EcuaRutasDbContext>();

            identificadores = await context.Notificaciones
                .AsNoTracking()
                .Where(n => n.Estado == "PENDIENTE")
                .OrderBy(n => n.CreadoEn)
                .ThenBy(n => n.Id)
                .Take(20)
                .Select(n => n.Id)
                .ToListAsync(cancellationToken);
        }

        foreach (var id in identificadores)
        {
            cancellationToken.ThrowIfCancellationRequested();

            using var scope = _scopeFactory.CreateScope();

            var context = scope.ServiceProvider
                .GetRequiredService<EcuaRutasDbContext>();

            var servicioCorreo = scope.ServiceProvider
                .GetRequiredService<CorreoSmtpService>();

            // Reclamar el registro de forma atómica.
            // Solamente un trabajador podrá cambiarlo
            // de PENDIENTE a PROCESANDO.
            var registrosActualizados =
                await context.Notificaciones
                    .Where(n =>
                        n.Id == id &&
                        n.Estado == "PENDIENTE")
                    .ExecuteUpdateAsync(
                        actualizacion => actualizacion
                            .SetProperty(
                                n => n.Estado,
                                "PROCESANDO"),
                        cancellationToken);

            if (registrosActualizados != 1)
            {
                continue;
            }

            try
            {
                var notificacion = await context.Notificaciones
                    .AsNoTracking()
                    .FirstAsync(
                        n => n.Id == id,
                        cancellationToken);

                await servicioCorreo.EnviarAsync(
                    notificacion.CorreoDestino,
                    notificacion.Asunto,
                    notificacion.Asunto,
                    cancellationToken);

                // SMTP aceptó el mensaje.
                await context.Notificaciones
                    .Where(n =>
                        n.Id == id &&
                        n.Estado == "PROCESANDO")
                    .ExecuteUpdateAsync(
                        actualizacion => actualizacion
                            .SetProperty(
                                n => n.Estado,
                                "ENVIADO")
                            .SetProperty(
                                n => n.EnviadoEn,
                                DateTime.UtcNow),
                        cancellationToken);

                _logger.LogInformation(
                    "Notificación {Id} aceptada por SMTP.",
                    id);
            }
            catch (OperationCanceledException)
                when (cancellationToken.IsCancellationRequested)
            {
                // El estado queda PROCESANDO para revisión.
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "No se pudo completar la notificación {Id}.",
                    id);

                try
                {
                    await context.Notificaciones
                        .Where(n =>
                            n.Id == id &&
                            n.Estado == "PROCESANDO")
                        .ExecuteUpdateAsync(
                            actualizacion => actualizacion
                                .SetProperty(
                                    n => n.Estado,
                                    "ERROR"),
                            cancellationToken);
                }
                catch (Exception errorRegistro)
                {
                    _logger.LogError(
                        errorRegistro,
                        "No se pudo registrar el error de la notificación {Id}.",
                        id);
                }
            }
        }
    }
}
