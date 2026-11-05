using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.DTOs.ResolucionesAnt;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/resoluciones-ant")]
[Authorize(Roles = "COOPERATIVA")]
public class ResolucionesAntController(
    IResolucionAntService service,
    ILogger<ResolucionesAntController>? logger = null)
    : ControllerBase
{
    [HttpGet]
    public Task<IActionResult> Listar(
        CancellationToken ct)
        => Ejecutar(async () =>
        {
            var cooperativaId =
                ObtenerCooperativaId();

            var resoluciones =
                await service.ListarAsync(ct);

            return Ok(
                resoluciones.Where(
                    r =>
                        r.CooperativaId ==
                        cooperativaId
                )
            );
        });

    [HttpGet("{id:long}")]
    public Task<IActionResult> Obtener(
        long id,
        CancellationToken ct)
        => Ejecutar(async () =>
        {
            ValidarId(id);

            var cooperativaId =
                ObtenerCooperativaId();

            var resultado =
                await service.ObtenerAsync(
                    id,
                    ct
                );

            if (
                resultado is null ||
                resultado.CooperativaId !=
                    cooperativaId
            )
            {
                return NotFound();
            }

            return Ok(resultado);
        });

    [HttpPost]
    public Task<IActionResult> Crear(
        CrearResolucionAntDto dto,
        CancellationToken ct)
        => Ejecutar(async () =>
        {
            dto.CooperativaId =
                ObtenerCooperativaId();

            var resultado =
                await service.CrearAsync(
                    dto,
                    ct
                );

            return CreatedAtAction(
                nameof(Obtener),
                new
                {
                    id = resultado.Id
                },
                resultado
            );
        });

    [HttpPut("{id:long}")]
    public Task<IActionResult> Actualizar(
        long id,
        ActualizarResolucionAntDto dto,
        CancellationToken ct)
        => Ejecutar(async () =>
        {
            ValidarId(id);

            var cooperativaId =
                ObtenerCooperativaId();

            var existente =
                await service.ObtenerAsync(
                    id,
                    ct
                );

            if (
                existente is null ||
                existente.CooperativaId !=
                    cooperativaId
            )
            {
                return NotFound();
            }

            dto.CooperativaId =
                cooperativaId;

            var resultado =
                await service.ActualizarAsync(
                    id,
                    dto,
                    ct
                );

            return resultado is null
                ? NotFound()
                : Ok(resultado);
        });

    [HttpDelete("{id:long}")]
    public Task<IActionResult> DarDeBaja(
        long id,
        CancellationToken ct)
        => Ejecutar(async () =>
        {
            ValidarId(id);

            var cooperativaId =
                ObtenerCooperativaId();

            var existente =
                await service.ObtenerAsync(
                    id,
                    ct
                );

            if (
                existente is null ||
                existente.CooperativaId !=
                    cooperativaId
            )
            {
                return NotFound();
            }

            return await service
                .DarDeBajaAsync(
                    id,
                    ct
                )
                ? NoContent()
                : NotFound();
        });

    private long ObtenerCooperativaId()
    {
        return User
            .ObtenerCooperativaContexto()
            ?? throw new ReglaNegocioException(
                403,
                "El usuario no tiene una cooperativa asociada."
            );
    }

    private static void ValidarId(
        long id)
    {
        if (id <= 0)
        {
            throw new ValidationException(
                "El identificador de resolución debe ser positivo."
            );
        }
    }

    private async Task<IActionResult> Ejecutar(
        Func<Task<IActionResult>> accion)
    {
        try
        {
            return await accion();
        }
        catch (ValidationException ex)
        {
            return BadRequest(
                new
                {
                    mensaje = ex.Message
                }
            );
        }
        catch (RecursoNoEncontradoException ex)
        {
            return NotFound(
                new
                {
                    mensaje = ex.Message
                }
            );
        }
        catch (ConflictoException ex)
        {
            return Conflict(
                new
                {
                    mensaje = ex.Message
                }
            );
        }
        catch (ReglaNegocioException ex)
        {
            return StatusCode(
                ex.StatusCode,
                new
                {
                    mensaje = ex.Message
                }
            );
        }
        catch (DbUpdateException ex)
        {
            logger?.LogError(
                ex,
                "Error de persistencia al gestionar resoluciones ANT."
            );

            return StatusCode(
                500,
                new
                {
                    mensaje =
                        "No se pudo guardar la resolución ANT."
                }
            );
        }
        catch (NpgsqlException ex)
        {
            logger?.LogError(
                ex,
                "Error de PostgreSQL al gestionar resoluciones ANT."
            );

            return StatusCode(
                500,
                new
                {
                    mensaje =
                        "No se pudo completar la operación de resoluciones ANT."
                }
            );
        }
    }
}