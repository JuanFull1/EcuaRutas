using EcuaRutas.Api.DTOs.PosicionesBus;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/posiciones-bus")]
[Authorize(Roles = "COOPERATIVA,OFICINISTA,BUS")]
public class PosicionesBusController : ControllerBase
{
    private readonly IPosicionBusService _service;

    public PosicionesBusController(IPosicionBusService service) => _service = service;

    [HttpPost("viajes/{viajeId:long}")]
    [Authorize(Roles = "BUS")]
    public Task<IActionResult> Registrar(long viajeId, RegistrarPosicionBusDto dto, CancellationToken ct)
        => Ejecutar(async () =>
        {
            var posicion = await _service.RegistrarAsync(viajeId, User.ObtenerUsuarioId(), dto, ct);
            return StatusCode(StatusCodes.Status201Created, posicion);
        });

    [HttpGet("viajes/{viajeId:long}/ultima")]
    public Task<IActionResult> Ultima(long viajeId, CancellationToken ct)
        => Ejecutar(async () =>
            Ok(await _service.ObtenerUltimaAsync(viajeId, User.ObtenerCooperativaContexto(), ct)));

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
