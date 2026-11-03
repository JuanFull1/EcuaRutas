
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
        // Revisar las notificaciones cada minuto.
        using var temporizador = new PeriodicTimer(
            TimeSpan.FromMinutes(1));

        try
        {
            // Primera revisión y posteriores revisiones periódicas.
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
                            "Error al procesar notificaciones pendientes.");
                    }
                }
            }
            while (await temporizador.WaitForNextTickAsync(
                stoppingToken));
        }
        catch (OperationCanceledException)
            when (stoppingToken.IsCancellationRequested)
        {
            // Finalización normal.
        }
    }

    private async Task ProcesarPendientesAsync(
        CancellationToken cancellationToken)
    {
        List<long> identificadores;

        // Obtener los ID de las primeras 20 notificaciones.
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

            // Cada correo tiene su propio contexto.
            using var scope = _scopeFactory.CreateScope();

            var context = scope.ServiceProvider
                .GetRequiredService<EcuaRutasDbContext>();

            var servicioCorreo = scope.ServiceProvider
                .GetRequiredService<CorreoSmtpService>();

            var notificacion = await context.Notificaciones
                .FirstOrDefaultAsync(
                    n => n.Id == id &&
                         n.Estado == "PENDIENTE",
                    cancellationToken);

            if (notificacion == null)
            {
                continue;
            }

            try
            {
                await servicioCorreo.EnviarAsync(
                    notificacion.CorreoDestino,
                    notificacion.Asunto,
                    notificacion.Asunto,
                    cancellationToken);

                // SMTP aceptó el correo.
                notificacion.Estado = "ENVIADO";
                notificacion.EnviadoEn = DateTime.UtcNow;

                await context.SaveChangesAsync(
                    cancellationToken);

                _logger.LogInformation(
                    "Notificación {Id} procesada correctamente.",
                    notificacion.Id);
            }
            catch (OperationCanceledException)
                when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error al enviar la notificación {Id}.",
                    notificacion.Id);

                // El registro continúa pendiente para
                // un próximo intento.
            }
        }
    }
}
