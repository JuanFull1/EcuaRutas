using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.DTOs.Rutas;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/rutas")]
public class RutasController : ControllerBase
{
    private readonly IRutaService _servicio;

    public RutasController(IRutaService servicio)
    {
        _servicio = servicio;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RutaDto>>> Listar(CancellationToken ct)
    {
        return Ok(await _servicio.ListarAsync(ct));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<RutaDto>> Obtener(long id, CancellationToken ct)
    {
        var ruta = await _servicio.ObtenerAsync(id, ct);
        return ruta is null ? NotFound() : Ok(ruta);
    }

    [Authorize(Roles = "ADMIN")]
    [HttpPost]
    public async Task<ActionResult<RutaDto>> Crear(
        [FromBody] CrearRutaDto request, CancellationToken ct)
    {
        try
        {
            var ruta = await _servicio.CrearAsync(request, ct);
            return CreatedAtAction(nameof(Obtener), new { id = ruta.Id }, ruta);
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
    public async Task<ActionResult<RutaDto>> Actualizar(
        long id, [FromBody] ActualizarRutaDto request, CancellationToken ct)
    {
        try
        {
            var ruta = await _servicio.ActualizarAsync(id, request, ct);
            return ruta is null ? NotFound() : Ok(ruta);
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
