using System.Security.Claims;
using EcuaRutas.Api.DTOs.Auth;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request)
    {
        var resultado =
            await _authService.LoginAsync(request);

        if (resultado is null)
        {
            return Unauthorized(
                new
                {
                    message =
                        "Correo o contraseña incorrectos."
                }
            );
        }

        return Ok(resultado);
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        return Ok(
            new
            {
                id = User.FindFirstValue(
                    ClaimTypes.NameIdentifier
                ),

                nombre = User.FindFirstValue(
                    ClaimTypes.Name
                ),

                correo = User.FindFirstValue(
                    ClaimTypes.Email
                ),

                rol = User.FindFirstValue(
                    ClaimTypes.Role
                ),

                cooperativaId =
                    User.FindFirstValue(
                        "cooperativa_id"
                    )
            }
        );
    }
}