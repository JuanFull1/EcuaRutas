using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.DTOs.ResolucionesAnt;
using EcuaRutas.Api.Services;
using EcuaRutas.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[CatalogosCooperativa]
[Route("api/resoluciones-ant")]
[Authorize(Roles = "ADMIN,COOPERATIVA")]
public class ResolucionesAntController(IResolucionAntService service, ILogger<ResolucionesAntController>? logger = null) : ControllerBase
{
    [HttpGet]
    public Task<IActionResult> Listar(CancellationToken ct) => Ejecutar(async () => Ok(await service.ListarAsync(ct)));

    [HttpGet("{id:long}")]
    public Task<IActionResult> Obtener(long id, CancellationToken ct) => Ejecutar(async () =>
    {
        ValidarId(id);
        var resultado = await service.ObtenerAsync(id, ct);
        return resultado is null ? NotFound() : Ok(resultado);
    });

    [HttpPost]
    [Authorize(Roles = "ADMIN,COOPERATIVA")]
    public Task<IActionResult> Crear(CrearResolucionAntDto dto, CancellationToken ct) => Ejecutar(async () =>
    {
        var resultado = await service.CrearAsync(dto, ct);
        return CreatedAtAction(nameof(Obtener), new { id = resultado.Id }, resultado);
    });

    [HttpPut("{id:long}")]
    [Authorize(Roles = "ADMIN,COOPERATIVA")]
    public Task<IActionResult> Actualizar(long id, ActualizarResolucionAntDto dto, CancellationToken ct) => Ejecutar(async () =>
    {
        ValidarId(id);
        var resultado = await service.ActualizarAsync(id, dto, ct);
        return resultado is null ? NotFound() : Ok(resultado);
    });

    [HttpDelete("{id:long}")]
    [Authorize(Roles = "ADMIN,COOPERATIVA")]
    public Task<IActionResult> DarDeBaja(long id, CancellationToken ct) => Ejecutar(async () =>
    {
        ValidarId(id);
        return await service.DarDeBajaAsync(id, ct) ? NoContent() : NotFound();
    });

    private static void ValidarId(long id)
    {
        if (id <= 0) throw new ValidationException("El identificador de resolución debe ser positivo.");
    }

    private async Task<IActionResult> Ejecutar(Func<Task<IActionResult>> accion)
    {
        try { return await accion(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ValidationException ex) { return BadRequest(new { mensaje = ex.Message }); }
        catch (RecursoNoEncontradoException ex) { return NotFound(new { mensaje = ex.Message }); }
        catch (ConflictoException ex) { return Conflict(new { mensaje = ex.Message }); }
        catch (DbUpdateException ex)
        {
            logger?.LogError(ex, "Error de persistencia al gestionar resoluciones ANT.");
            return StatusCode(500, new { mensaje = "No se pudo guardar la resolución ANT." });
        }
        catch (NpgsqlException ex)
        {
            logger?.LogError(ex, "Error de PostgreSQL al gestionar resoluciones ANT.");
            return StatusCode(500, new { mensaje = "No se pudo completar la operación de resoluciones ANT." });
        }
    }
}
