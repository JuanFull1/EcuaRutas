using EcuaRutas.Api.DTOs.OperacionBus;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/operacion-bus")]
[Authorize(Roles = "BUS")]
public class OperacionBusController : ControllerBase
{
    private readonly IOperacionBusService _service;

    public OperacionBusController(IOperacionBusService service) => _service = service;

    [HttpGet("viajes")]
    public Task<IActionResult> ListarAsignados(CancellationToken ct)
        => Ejecutar(async () => Ok(await _service.ListarViajesAsignadosAsync(User.ObtenerUsuarioId(), ct)));

    [HttpGet("viajes/historial")]
    public Task<IActionResult> Historial(CancellationToken ct)
        => Ejecutar(async () => Ok(await _service.ListarHistorialAsync(User.ObtenerUsuarioId(), ct)));

    [HttpPost("viajes/{viajeId:long}/iniciar")]
    public Task<IActionResult> Iniciar(long viajeId, CancellationToken ct)
        => Ejecutar(async () => Ok(await _service.IniciarViajeAsync(viajeId, User.ObtenerUsuarioId(), ct)));

    [HttpGet("viajes/{viajeId:long}/asientos")]
    public Task<IActionResult> MapaAsientos(long viajeId, CancellationToken ct)
        => Ejecutar(async () => Ok(await _service.ObtenerMapaAsientosAsync(viajeId, User.ObtenerUsuarioId(), ct)));

    [HttpGet("viajes/{viajeId:long}/reporte")]
    public Task<IActionResult> Reporte(long viajeId, CancellationToken ct)
        => Ejecutar(async () => Ok(await _service.ObtenerReporteAsync(viajeId, User.ObtenerUsuarioId(), ct)));
    [HttpPost("viajes/{viajeId:long}/abordar")]
    public Task<IActionResult> Abordar(long viajeId, AbordarPasajeroDto dto, CancellationToken ct)
        => Ejecutar(async () =>
            Ok(await _service.AbordarPasajeroAsync(viajeId, User.ObtenerUsuarioId(), dto, ct)));

    [HttpPost("viajes/{viajeId:long}/no-presentado")]
    public Task<IActionResult> NoPresentado(long viajeId, MarcarNoPresentadoDto dto, CancellationToken ct)
        => Ejecutar(async () =>
            Ok(await _service.MarcarNoPresentadoAsync(viajeId, User.ObtenerUsuarioId(), dto, ct)));

    [HttpPost("viajes/{viajeId:long}/ocupaciones/{ocupacionId:long}/liberar")]
    public Task<IActionResult> Liberar(long viajeId, long ocupacionId, LiberarAsientoDto dto, CancellationToken ct)
        => Ejecutar(async () =>
            Ok(await _service.LiberarAsientoAsync(viajeId, ocupacionId, User.ObtenerUsuarioId(), dto, ct)));

    [HttpPost("viajes/{viajeId:long}/venta-asientos/{ventaAsientoId:long}/extender")]
    public Task<IActionResult> Extender(long viajeId, long ventaAsientoId, ExtenderBoletoDto dto, CancellationToken ct)
        => Ejecutar(async () =>
        {
            await _service.ExtenderBoletoAsync(viajeId, ventaAsientoId, User.ObtenerUsuarioId(), dto, ct);
            return NoContent();
        });

    [HttpPost("viajes/{viajeId:long}/finalizar")]
    public Task<IActionResult> Finalizar(long viajeId, CancellationToken ct)
        => Ejecutar(async () => Ok(await _service.FinalizarViajeAsync(viajeId, User.ObtenerUsuarioId(), ct)));

    // Traduce ReglaNegocioException a su código HTTP (400/403/404/409).
    private async Task<IActionResult> Ejecutar(Func<Task<IActionResult>> accion)
    {
        try
        {
            return await accion();
        }
        catch (ReglaNegocioException ex)
        {
            return StatusCode(ex.StatusCode, new { mensaje = ex.Message });
        }
    }
}