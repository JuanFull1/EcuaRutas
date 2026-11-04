using System.Security.Claims;
using EcuaRutas.Api.DTOs.Cooperativas;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/cooperativas")]
[Authorize]
public class CooperativasController
    : ControllerBase
{
    private readonly
        ICooperativasService
        _cooperativasService;

    public CooperativasController(
        ICooperativasService
            cooperativasService
    )
    {
        _cooperativasService =
            cooperativasService;
    }

    [HttpGet("admin")]
    [Authorize(Roles = "ADMIN")]
    public async Task<
        ActionResult<
            IReadOnlyList<
                CooperativaDto
            >
        >
    > Listar(
        [FromQuery]
        string? busqueda = null,

        [FromQuery]
        bool? activa = null
    )
    {
        var cooperativas =
            await _cooperativasService
                .ListarAsync(
                    busqueda,
                    activa
                );

        return Ok(
            cooperativas
        );
    }

    [HttpGet("admin/{id:long}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<
        ActionResult<CooperativaDto>
    > Obtener(
        long id
    )
    {
        var cooperativa =
            await _cooperativasService
                .ObtenerPorIdAsync(
                    id
                );

        if (cooperativa == null)
        {
            return NotFound(
                new
                {
                    message =
                        "La cooperativa no existe."
                }
            );
        }

        return Ok(
            cooperativa
        );
    }

    [HttpPost("admin")]
    [Authorize(Roles = "ADMIN")]
    public async Task<
        ActionResult<
            CrearCooperativaResponse
        >
    > Crear(
        [FromBody]
        CrearCooperativaRequest
            request
    )
    {
        try
        {
            var respuesta =
                await _cooperativasService
                    .CrearAsync(
                        request
                    );

            return CreatedAtAction(
                nameof(Obtener),
                new
                {
                    id =
                        respuesta
                            .Cooperativa
                            .Id
                },
                respuesta
            );
        }
        catch (
            InvalidOperationException
                exception
        )
        {
            if (
                exception.Message
                    .Contains(
                        "Ya existe",
                        StringComparison
                            .OrdinalIgnoreCase
                    )
            )
            {
                return Conflict(
                    new
                    {
                        message =
                            exception.Message
                    }
                );
            }

            return BadRequest(
                new
                {
                    message =
                        exception.Message
                }
            );
        }
    }

    [HttpPut("admin/{id:long}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<
        ActionResult<CooperativaDto>
    > ActualizarAdmin(
        long id,

        [FromBody]
        ActualizarCooperativaAdminRequest
            request
    )
    {
        try
        {
            var cooperativa =
                await _cooperativasService
                    .ActualizarAdminAsync(
                        id,
                        request
                    );

            if (cooperativa == null)
            {
                return NotFound(
                    new
                    {
                        message =
                            "La cooperativa no existe."
                    }
                );
            }

            return Ok(
                cooperativa
            );
        }
        catch (
            InvalidOperationException
                exception
        )
        {
            if (
                exception.Message
                    .Contains(
                        "Ya existe",
                        StringComparison
                            .OrdinalIgnoreCase
                    )
            )
            {
                return Conflict(
                    new
                    {
                        message =
                            exception.Message
                    }
                );
            }

            return BadRequest(
                new
                {
                    message =
                        exception.Message
                }
            );
        }
    }

    [HttpPatch(
        "admin/{id:long}/estado"
    )]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult>
        CambiarEstado(
            long id,

            [FromBody]
            CambiarEstadoCooperativaRequest
                request
        )
    {
        var existe =
            await _cooperativasService
                .CambiarEstadoAsync(
                    id,
                    request.Activa
                );

        if (!existe)
        {
            return NotFound(
                new
                {
                    message =
                        "La cooperativa no existe."
                }
            );
        }

        return Ok(
            new
            {
                message =
                    request.Activa
                        ? "Cooperativa activada correctamente."
                        : "Cooperativa desactivada correctamente.",

                activa =
                    request.Activa
            }
        );
    }

    [HttpGet("mi-cooperativa")]
    [Authorize(Roles = "COOPERATIVA")]
    public async Task<
        ActionResult<CooperativaDto>
    > ObtenerMiCooperativa()
    {
        var cooperativaId =
            ObtenerCooperativaId();

        if (!cooperativaId.HasValue)
        {
            return StatusCode(
                StatusCodes
                    .Status403Forbidden,

                new
                {
                    message =
                        "El usuario no tiene una cooperativa asociada."
                }
            );
        }

        var cooperativa =
            await _cooperativasService
                .ObtenerMiCooperativaAsync(
                    cooperativaId.Value
                );

        if (cooperativa == null)
        {
            return NotFound(
                new
                {
                    message =
                        "La cooperativa asociada al usuario no existe."
                }
            );
        }

        return Ok(
            cooperativa
        );
    }

    [HttpPut("mi-cooperativa")]
    [Authorize(Roles = "COOPERATIVA")]
    public async Task<
        ActionResult<CooperativaDto>
    > ActualizarMiCooperativa(
        [FromBody]
        ActualizarMiCooperativaRequest
            request
    )
    {
        var cooperativaId =
            ObtenerCooperativaId();

        if (!cooperativaId.HasValue)
        {
            return StatusCode(
                StatusCodes
                    .Status403Forbidden,

                new
                {
                    message =
                        "El usuario no tiene una cooperativa asociada."
                }
            );
        }

        try
        {
            var cooperativa =
                await _cooperativasService
                    .ActualizarMiCooperativaAsync(
                        cooperativaId.Value,
                        request
                    );

            if (cooperativa == null)
            {
                return NotFound(
                    new
                    {
                        message =
                            "La cooperativa asociada al usuario no existe."
                    }
                );
            }

            return Ok(
                cooperativa
            );
        }
        catch (
            InvalidOperationException
                exception
        )
        {
            return BadRequest(
                new
                {
                    message =
                        exception.Message
                }
            );
        }
    }

    private long?
        ObtenerCooperativaId()
    {
        var valor =
            User.FindFirstValue(
                UsuarioActualExtensions
                    .ClaimCooperativa
            );

        return long.TryParse(
            valor,
            out var cooperativaId
        )
            ? cooperativaId
            : null;
    }
}