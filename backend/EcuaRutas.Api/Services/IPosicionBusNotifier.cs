using EcuaRutas.Api.DTOs.PosicionesBus;

namespace EcuaRutas.Api.Services;

public interface IPosicionBusNotifier
{
    Task NotificarAsync(PosicionBusDto posicion, CancellationToken ct = default);
}

public sealed class SinNotificacionPosicionBus : IPosicionBusNotifier
{
    public Task NotificarAsync(PosicionBusDto posicion, CancellationToken ct = default) => Task.CompletedTask;
}