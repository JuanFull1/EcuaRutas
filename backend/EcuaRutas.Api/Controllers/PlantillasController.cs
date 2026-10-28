using EcuaRutas.Api.DTOs;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/plantillas")]
[Authorize(Roles = "ADMIN,COOPERATIVA,OFICINISTA")]
public class PlantillasController : ControllerBase
{
    private readonly IPlantillaService _servicio;

    public PlantillasController(IPlantillaService servicio)
    {
        _servicio = servicio;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PlantillaBusDto>>> Listar(
        [FromQuery] long? cooperativaId, CancellationToken ct)
    {
        return Ok(await _servicio.ListarAsync(cooperativaId, ct));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<PlantillaBusDto>> Obtener(long id, CancellationToken ct)
    {
        var plantilla = await _servicio.ObtenerAsync(id, ct);
        return plantilla is null ? NotFound() : Ok(plantilla);
    }

    [Authorize(Roles = "ADMIN,COOPERATIVA")]
    [HttpPost]
    public async Task<ActionResult<PlantillaBusDto>> Crear(
        CrearPlantillaBusRequest request, CancellationToken ct)
    {
        try
        {
            var plantilla = await _servicio.CrearAsync(request, ct);
            return CreatedAtAction(nameof(Obtener), new { id = plantilla.Id }, plantilla);
        }
        catch (RecursoNoEncontradoException ex)
        {
            return NotFound(new { mensaje = ex.Message });
        }
    }

    [HttpGet("{id:long}/asientos")]
    public async Task<ActionResult<IReadOnlyList<PlantillaAsientoDto>>> ObtenerDisposicion(
        long id, CancellationToken ct)
    {
        var asientos = await _servicio.ObtenerDisposicionAsync(id, ct);
        return asientos is null ? NotFound() : Ok(asientos);
    }

    [Authorize(Roles = "ADMIN,COOPERATIVA")]
    [HttpPut("{id:long}/asientos")]
    public async Task<ActionResult<IReadOnlyList<PlantillaAsientoDto>>> DefinirDisposicion(
        long id, List<CrearAsientoPlantillaRequest> asientos, CancellationToken ct)
    {
        try
        {
            var resultado = await _servicio.DefinirDisposicionAsync(id, asientos, ct);
            return resultado is null ? NotFound() : Ok(resultado);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
        catch (RecursoNoEncontradoException ex)
        {
            return NotFound(new { mensaje = ex.Message });
        }
    }

    [Authorize(Roles = "ADMIN,COOPERATIVA")]
    [HttpPut("/api/buses/{busId:long}/plantilla/{plantillaId:long}")]
    public async Task<IActionResult> AsignarABus(long busId, long plantillaId, CancellationToken ct)
    {
        try
        {
            var asignada = await _servicio.AsignarABusAsync(busId, plantillaId, ct);
            return asignada ? NoContent() : NotFound();
        }
        catch (ConflictoException ex)
        {
            return Conflict(new { mensaje = ex.Message });
        }
    }

    [HttpGet("/api/buses/{busId:long}/asientos")]
    public async Task<ActionResult<IReadOnlyList<AsientoBusDto>>> ListarAsientosDeBus(
        long busId, CancellationToken ct)
    {
        var asientos = await _servicio.ListarAsientosDeBusAsync(busId, ct);
        return asientos is null ? NotFound() : Ok(asientos);
    }
}
