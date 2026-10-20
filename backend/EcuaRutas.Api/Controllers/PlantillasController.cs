using EcuaRutas.Api.DTOs;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/plantillas")]
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

    [HttpPost]
    public async Task<ActionResult<PlantillaBusDto>> Crear(
        CrearPlantillaBusRequest request, CancellationToken ct)
    {
        var plantilla = await _servicio.CrearAsync(request, ct);
        return CreatedAtAction(nameof(Obtener), new { id = plantilla.Id }, plantilla);
    }
}
