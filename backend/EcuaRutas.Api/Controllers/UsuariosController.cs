using EcuaRutas.Api.DTOs.Usuarios;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/usuarios")]
[Authorize(Roles = "ADMIN")]
public class UsuariosController : ControllerBase
{
    private readonly IUsuariosService _usuariosService;

    public UsuariosController(
        IUsuariosService usuariosService
    )
    {
        _usuariosService = usuariosService;
    }

    // GET: api/usuarios
    [HttpGet]
    public async Task<ActionResult<
        IReadOnlyList<UsuarioDto>
    >> Listar(
        [FromQuery] string? busqueda = null,
        [FromQuery] long? rolId = null,
        [FromQuery] bool? activo = null
    )
    {
        var usuarios =
            await _usuariosService.ListarAsync(
                busqueda,
                rolId,
                activo
            );

        return Ok(usuarios);
    }

    // GET: api/usuarios/roles
    [HttpGet("roles")]
    public async Task<ActionResult<
        IReadOnlyList<RolDto>
    >> ListarRoles()
    {
        var roles =
            await _usuariosService
                .ListarRolesAsync();

        return Ok(roles);
    }

    // GET: api/usuarios/cooperativas
[HttpGet("cooperativas")]
public async Task<ActionResult<
    IReadOnlyList<CooperativaResumenDto>
>> ListarCooperativas()
{
    var cooperativas =
        await _usuariosService
            .ListarCooperativasActivasAsync();

    return Ok(cooperativas);
}

    // GET: api/usuarios/5
    [HttpGet("{id:long}")]
    public async Task<ActionResult<UsuarioDto>>
        ObtenerPorId(
            long id
        )
    {
        var usuario =
            await _usuariosService
                .ObtenerPorIdAsync(id);

        if (usuario is null)
        {
            return NotFound(
                new
                {
                    message =
                        "El usuario no existe."
                }
            );
        }

        return Ok(usuario);
    }

    // POST: api/usuarios
    [HttpPost]
    public async Task<ActionResult<UsuarioDto>>
        Crear(
            [FromBody]
            CrearUsuarioRequest request
        )
    {
        try
        {
            var usuario =
                await _usuariosService
                    .CrearAsync(request);

            return CreatedAtAction(
                nameof(ObtenerPorId),
                new
                {
                    id = usuario.Id
                },
                usuario
            );
        }
        catch (InvalidOperationException ex)
        {
            if (
                ex.Message.StartsWith(
                    "Ya existe",
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return Conflict(
                    new
                    {
                        message = ex.Message
                    }
                );
            }

            return BadRequest(
                new
                {
                    message = ex.Message
                }
            );
        }
    }

    // PUT: api/usuarios/5
    [HttpPut("{id:long}")]
    public async Task<ActionResult<UsuarioDto>>
        Actualizar(
            long id,
            [FromBody]
            ActualizarUsuarioRequest request
        )
    {
        try
        {
            var usuario =
                await _usuariosService
                    .ActualizarAsync(
                        id,
                        request
                    );

            if (usuario is null)
            {
                return NotFound(
                    new
                    {
                        message =
                            "El usuario no existe."
                    }
                );
            }

            return Ok(usuario);
        }
        catch (InvalidOperationException ex)
        {
            if (
                ex.Message.StartsWith(
                    "Ya existe",
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return Conflict(
                    new
                    {
                        message = ex.Message
                    }
                );
            }

            return BadRequest(
                new
                {
                    message = ex.Message
                }
            );
        }
    }

    // PATCH: api/usuarios/5/estado
    [HttpPatch("{id:long}/estado")]
    public async Task<IActionResult>
        CambiarEstado(
            long id,
            [FromBody]
            CambiarEstadoUsuarioRequest request
        )
    {
        var actualizado =
            await _usuariosService
                .CambiarEstadoAsync(
                    id,
                    request.Activo
                );

        if (!actualizado)
        {
            return NotFound(
                new
                {
                    message =
                        "El usuario no existe."
                }
            );
        }

        return Ok(
            new
            {
                message =
                    request.Activo
                        ? "Usuario activado correctamente."
                        : "Usuario desactivado correctamente.",

                activo =
                    request.Activo
            }
        );
    }

    // PATCH: api/usuarios/5/password
    [HttpPatch("{id:long}/password")]
    public async Task<IActionResult>
        RestablecerPassword(
            long id,
            [FromBody]
            RestablecerPasswordRequest request
        )
    {
        var actualizado =
            await _usuariosService
                .RestablecerPasswordAsync(
                    id,
                    request.NuevaPassword
                );

        if (!actualizado)
        {
            return NotFound(
                new
                {
                    message =
                        "El usuario no existe."
                }
            );
        }

        return Ok(
            new
            {
                message =
                    "Contraseña restablecida correctamente."
            }
        );
    }
}