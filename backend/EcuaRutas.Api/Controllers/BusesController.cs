using EcuaRutas.Api.DTOs;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/buses")]
public class BusesController : ControllerBase
{
    private readonly IBusService _servicio;

    public BusesController(IBusService servicio)
    {
        _servicio = servicio;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BusDto>>> Listar(
        [FromQuery] long cooperativaId,
        [FromQuery] long? grupoBusId,
        [FromQuery] string? estado,
        CancellationToken ct)
    {
        var buses = await _servicio.ListarAsync(cooperativaId, grupoBusId, estado, ct);
        return Ok(buses);
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<BusDto>> Obtener(long id, CancellationToken ct)
    {
        var bus = await _servicio.ObtenerAsync(id, ct);
        if (bus is null)
            return NotFound();

        return Ok(bus);
    }

    [HttpPost]
    public async Task<ActionResult<BusDto>> Crear(CrearBusRequest request, CancellationToken ct)
    {
        var bus = await _servicio.CrearAsync(request, ct);
        return CreatedAtAction(nameof(Obtener), new { id = bus.Id }, bus);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<BusDto>> Actualizar(long id, ActualizarBusRequest request, CancellationToken ct)
    {
        var bus = await _servicio.ActualizarAsync(id, request, ct);
        if (bus is null)
            return NotFound();

        return Ok(bus);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DarDeBaja(long id, CancellationToken ct)
    {
        var dadoDeBaja = await _servicio.DarDeBajaAsync(id, ct);
        if (!dadoDeBaja)
            return NotFound();

        return NoContent();
    }
}
