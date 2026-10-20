using EcuaRutas.Api.DTOs;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/grupos-buses")]
public class GruposBusesController : ControllerBase
{
    private readonly IGrupoBusService _servicio;

    public GruposBusesController(IGrupoBusService servicio)
    {
        _servicio = servicio;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<GrupoBusDto>>> Listar(
        [FromQuery] long cooperativaId, CancellationToken ct)
    {
        return Ok(await _servicio.ListarAsync(cooperativaId, ct));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<GrupoBusDto>> Obtener(long id, CancellationToken ct)
    {
        var grupo = await _servicio.ObtenerAsync(id, ct);
        return grupo is null ? NotFound() : Ok(grupo);
    }

        [HttpPost]
    public async Task<ActionResult<GrupoBusDto>> Crear(
        CrearGrupoBusRequest request, CancellationToken ct)
    {
        try
        {
            var grupo = await _servicio.CrearAsync(request, ct);
            return CreatedAtAction(nameof(Obtener), new { id = grupo.Id }, grupo);
        }
        catch (RecursoNoEncontradoException ex)
        {
            return NotFound(new { mensaje = ex.Message });
        }
        catch (ConflictoException ex)
        {
            return Conflict(new { mensaje = ex.Message });
        }
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<GrupoBusDto>> Actualizar(
        long id, ActualizarGrupoBusRequest request, CancellationToken ct)
    {
        try
        {
            var grupo = await _servicio.ActualizarAsync(id, request, ct);
            return grupo is null ? NotFound() : Ok(grupo);
        }
        catch (ConflictoException ex)
        {
            return Conflict(new { mensaje = ex.Message });
        }
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Desactivar(long id, CancellationToken ct)
    {
        var desactivado = await _servicio.DesactivarAsync(id, ct);
        return desactivado ? NoContent() : NotFound();
    }
}