using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.DTOs.Frecuencias;
using EcuaRutas.Api.DTOs.Tarifas;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/frecuencias/{frecuenciaId:long}/tarifas")]
[Authorize(Roles = "COOPERATIVA")]
public class TarifasFrecuenciaController(
    ITarifaFrecuenciaService service,
    IFrecuenciaService frecuenciaService,
    ILogger<TarifasFrecuenciaController>? logger = null)
    : ControllerBase
{
    [HttpGet]
    public Task<IActionResult> Listar(
        long frecuenciaId,
        CancellationToken ct)
        => Ejecutar(async () =>
        {
            await ObtenerFrecuenciaPropiaAsync(
                frecuenciaId,
                ct
            );

            return Ok(
                await service
                    .ListarPorFrecuenciaAsync(
                        frecuenciaId,
                        ct
                    )
            );
        });

    [HttpGet("{id:long}")]
    public Task<IActionResult> Obtener(
        long frecuenciaId,
        long id,
        CancellationToken ct)
        => Ejecutar(async () =>
        {
            await ObtenerFrecuenciaPropiaAsync(
                frecuenciaId,
                ct
            );

            var resultado =
                await ObtenerContextualAsync(
                    frecuenciaId,
                    id,
                    ct
                );

            return resultado is null
                ? NotFound()
                : Ok(resultado);
        });

    [HttpPost]
    public Task<IActionResult> Crear(
        long frecuenciaId,
        CrearTarifaFrecuenciaDto dto,
        CancellationToken ct)
        => Ejecutar(async () =>
        {
            await ObtenerFrecuenciaPropiaAsync(
                frecuenciaId,
                ct
            );

            var resultado =
                await service.CrearAsync(
                    frecuenciaId,
                    dto,
                    ct
                );

            return CreatedAtAction(
                nameof(Obtener),
                new
                {
                    frecuenciaId,
                    id = resultado.Id
                },
                resultado
            );
        });

    [HttpPut("{id:long}")]
    public Task<IActionResult> Actualizar(
        long frecuenciaId,
        long id,
        ActualizarTarifaFrecuenciaDto dto,
        CancellationToken ct)
        => Ejecutar(async () =>
        {
            await ObtenerFrecuenciaPropiaAsync(
                frecuenciaId,
                ct
            );

            if (
                await ObtenerContextualAsync(
                    frecuenciaId,
                    id,
                    ct
                )
                is null
            )
            {
                return NotFound();
            }

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
        long frecuenciaId,
        long id,
        CancellationToken ct)
        => Ejecutar(async () =>
        {
            await ObtenerFrecuenciaPropiaAsync(
                frecuenciaId,
                ct
            );

            if (
                await ObtenerContextualAsync(
                    frecuenciaId,
                    id,
                    ct
                )
                is null
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

    private async Task<FrecuenciaDto>
        ObtenerFrecuenciaPropiaAsync(
            long frecuenciaId,
            CancellationToken ct)
    {
        ValidarId(frecuenciaId);

        var cooperativaId =
            ObtenerCooperativaId();

        var frecuencia =
            await frecuenciaService
                .ObtenerAsync(
                    frecuenciaId,
                    ct
                );

        if (
            frecuencia is null ||
            frecuencia.CooperativaId !=
                cooperativaId
        )
        {
            throw new RecursoNoEncontradoException(
                "No existe la frecuencia solicitada para la cooperativa autenticada."
            );
        }

        return frecuencia;
    }

    private async Task<TarifaFrecuenciaDto?>
        ObtenerContextualAsync(
            long frecuenciaId,
            long id,
            CancellationToken ct)
    {
        ValidarId(frecuenciaId);
        ValidarId(id);

        var tarifa =
            await service.ObtenerAsync(
                id,
                ct
            );

        if (
            tarifa is null ||
            tarifa.FrecuenciaId !=
                frecuenciaId
        )
        {
            return null;
        }

        return tarifa;
    }

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
                "El identificador debe ser positivo."
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
                "Error de persistencia al gestionar tarifas."
            );

            return StatusCode(
                500,
                new
                {
                    mensaje =
                        "No se pudo guardar la tarifa."
                }
            );
        }
        catch (NpgsqlException ex)
        {
            logger?.LogError(
                ex,
                "Error de PostgreSQL al gestionar tarifas."
            );

            return StatusCode(
                500,
                new
                {
                    mensaje =
                        "No se pudo completar la operación de tarifas."
                }
            );
        }
    }
}