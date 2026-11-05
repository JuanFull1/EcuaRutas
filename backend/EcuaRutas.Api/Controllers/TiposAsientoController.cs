using EcuaRutas.Api.DTOs;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/tipos-asiento")]
[Authorize(Roles = "COOPERATIVA,OFICINISTA")]
public class TiposAsientoController : ControllerBase
{
    private readonly IPlantillaService _servicio;

    public TiposAsientoController(IPlantillaService servicio)
    {
        _servicio = servicio;
    }

    // ADMIN opera sobre cualquier tipo (incluidos los generales); una cooperativa, solo sobre los suyos.
    private ActionResult? DenegarSiNoEsSuyo(long? cooperativaId)
    {
        try
        {
            var contexto = User.ObtenerCooperativaContexto();

            if (contexto is null || contexto == cooperativaId)
            {
                return null;
            }

            return StatusCode(403, new
            {
                mensaje = cooperativaId is null
                    ? "Solo un administrador puede operar sobre los tipos generales."
                    : "No puede operar sobre otra cooperativa."
            });
        }
        catch (ReglaNegocioException ex)
        {
            return StatusCode(ex.StatusCode, new { mensaje = ex.Message });
        }
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TipoAsientoDto>>> Listar(
        [FromQuery] long? cooperativaId, CancellationToken ct)
    {
        return Ok(await _servicio.ListarTiposAsientoAsync(cooperativaId, ct));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<TipoAsientoDto>> Obtener(long id, CancellationToken ct)
    {
        var tipo = await _servicio.ObtenerTipoAsientoAsync(id, ct);
        return tipo is null ? NotFound() : Ok(tipo);
    }

    [Authorize(Roles = "ADMIN,COOPERATIVA")]
    [HttpPost]
    public async Task<ActionResult<TipoAsientoDto>> Crear(
        CrearTipoAsientoRequest request, CancellationToken ct)
    {
        try
        {
            // Una cooperativa siempre crea tipos propios.
            request.CooperativaId ??= User.ObtenerCooperativaContexto();
        }
        catch (ReglaNegocioException ex)
        {
            return StatusCode(ex.StatusCode, new { mensaje = ex.Message });
        }

        var denegado = DenegarSiNoEsSuyo(request.CooperativaId);

        if (denegado is not null)
        {
            return denegado;
        }

        try
        {
            var tipo = await _servicio.CrearTipoAsientoAsync(request, ct);
            return CreatedAtAction(nameof(Obtener), new { id = tipo.Id }, tipo);
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

    [Authorize(Roles = "ADMIN,COOPERATIVA")]
    [HttpPut("{id:long}")]
    public async Task<ActionResult<TipoAsientoDto>> Actualizar(
        long id, ActualizarTipoAsientoRequest request, CancellationToken ct)
    {
        var existente = await _servicio.ObtenerTipoAsientoAsync(id, ct);

        if (existente is null)
        {
            return NotFound();
        }

        var denegado = DenegarSiNoEsSuyo(existente.CooperativaId);

        if (denegado is not null)
        {
            return denegado;
        }

        try
        {
            var tipo = await _servicio.ActualizarTipoAsientoAsync(id, request, ct);
            return tipo is null ? NotFound() : Ok(tipo);
        }
        catch (ConflictoException ex)
        {
            return Conflict(new { mensaje = ex.Message });
        }
    }

    [Authorize(Roles = "ADMIN,COOPERATIVA")]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Desactivar(long id, CancellationToken ct)
    {
        var existente = await _servicio.ObtenerTipoAsientoAsync(id, ct);

        if (existente is null)
        {
            return NotFound();
        }

        var denegado = DenegarSiNoEsSuyo(existente.CooperativaId);

        if (denegado is not null)
        {
            return denegado;
        }

        await _servicio.DesactivarTipoAsientoAsync(id, ct);
        return NoContent();
    }
}
