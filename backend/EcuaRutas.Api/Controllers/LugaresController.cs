using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.DTOs.Rutas;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/lugares")]
public class LugaresController : ControllerBase
{
    private readonly ILugarService _servicio;

    public LugaresController(ILugarService servicio)
    {
        _servicio = servicio;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<LugarDto>>> Listar(CancellationToken ct)
    {
        return Ok(await _servicio.ListarAsync(ct));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<LugarDto>> Obtener(long id, CancellationToken ct)
    {
        var lugar = await _servicio.ObtenerAsync(id, ct);
        return lugar is null ? NotFound() : Ok(lugar);
    }

    [Authorize(Roles = "ADMIN")]
    [HttpPost]
    public async Task<ActionResult<LugarDto>> Crear(
        [FromBody] CrearLugarDto request, CancellationToken ct)
    {
        try
        {
            var lugar = await _servicio.CrearAsync(request, ct);
            return CreatedAtAction(nameof(Obtener), new { id = lugar.Id }, lugar);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
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

    [Authorize(Roles = "ADMIN")]
    [HttpPut("{id:long}")]
    public async Task<ActionResult<LugarDto>> Actualizar(
        long id, [FromBody] ActualizarLugarDto request, CancellationToken ct)
    {
        try
        {
            var lugar = await _servicio.ActualizarAsync(id, request, ct);
            return lugar is null ? NotFound() : Ok(lugar);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
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

    [Authorize(Roles = "ADMIN")]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DarDeBaja(long id, CancellationToken ct)
    {
        try
        {
            var resultado = await _servicio.DarDeBajaAsync(id, ct);
            return resultado ? NoContent() : NotFound();
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
}
