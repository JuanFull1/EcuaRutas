using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace EcuaRutas.Api.Services;

public sealed class ReservasExpirationWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReservasExpirationWorker> _logger;

    public ReservasExpirationWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<ReservasExpirationWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var ventasService = scope.ServiceProvider
                    .GetRequiredService<VentasService>();
                var expiradas = await ventasService.ExpirarReservasAsync();

                if (expiradas > 0)
                {
                    _logger.LogInformation(
                        "Se liberaron {Cantidad} reserva(s) vencida(s).",
                        expiradas);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al liberar reservas vencidas.");
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}