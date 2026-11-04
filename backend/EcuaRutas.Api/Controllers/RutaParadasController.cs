using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.DTOs.Rutas;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/rutas/{rutaId:long}/paradas")]
public class RutaParadasController : ControllerBase
{
    private readonly IRutaParadaService _servicio;

    public RutaParadasController(IRutaParadaService servicio)
    {
        _servicio = servicio;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RutaParadaDto>>> Listar(long rutaId, CancellationToken ct)
    {
        try
        {
            return Ok(await _servicio.ListarAsync(rutaId, ct));
        }
        catch (RecursoNoEncontradoException ex)
        {
            return NotFound(new { mensaje = ex.Message });
        }
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<RutaParadaDto>> Obtener(long rutaId, long id, CancellationToken ct)
    {
        try
        {
            var parada = await _servicio.ObtenerAsync(rutaId, id, ct);
            return parada is null ? NotFound() : Ok(parada);
        }
        catch (RecursoNoEncontradoException ex)
        {
            return NotFound(new { mensaje = ex.Message });
        }
    }

    [Authorize(Roles = "ADMIN")]
    [HttpPost]
    public async Task<ActionResult<RutaParadaDto>> Crear(
        long rutaId, [FromBody] CrearRutaParadaDto request, CancellationToken ct)
    {
        try
        {
            var parada = await _servicio.CrearAsync(rutaId, request, ct);
            return CreatedAtAction(nameof(Obtener), new { rutaId, id = parada.Id }, parada);
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
    public async Task<ActionResult<RutaParadaDto>> Actualizar(
        long rutaId, long id, [FromBody] ActualizarRutaParadaDto request, CancellationToken ct)
    {
        try
        {
            var parada = await _servicio.ActualizarAsync(rutaId, id, request, ct);
            return parada is null ? NotFound() : Ok(parada);
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
    public async Task<IActionResult> Eliminar(long rutaId, long id, CancellationToken ct)
    {
        try
        {
            var resultado = await _servicio.EliminarAsync(rutaId, id, ct);
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
