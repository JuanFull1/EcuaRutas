
using EcuaRutas.Api.DTOs.Cliente;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/cliente")]
public class ClienteController : ControllerBase
{
    private readonly ClienteService _clienteService;
    private readonly ReservasClienteService _reservasClienteService;

    public ClienteController(ClienteService clienteService, ReservasClienteService reservasClienteService)
    {
        _clienteService = clienteService;
        _reservasClienteService = reservasClienteService;
    }

    // GET: api/cliente/viajes
    [HttpGet("viajes")]
    public async Task<IActionResult> BuscarViajes(
        [FromQuery] BuscarViajesClienteDto filtros)
    {
        try
        {
            var viajes = await _clienteService.BuscarViajesAsync(
                filtros
            );

            return Ok(viajes);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                mensaje = ex.Message
            });
        }
        catch (NotSupportedException ex)
        {
            return StatusCode(501, new
            {
                mensaje = ex.Message
            });
        }
    }

    [Authorize(Roles = "CLIENTE")]
    [HttpGet("historial")]
    public async Task<IActionResult> ObtenerHistorial()
    {
        var identificador = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!long.TryParse(identificador, out long usuarioId)
            || usuarioId <= 0)
        {
            return Unauthorized(new
            {
                mensaje = "No se pudo identificar al cliente."
            });
        }

        var compras = await _clienteService
            .ObtenerHistorialComprasAsync(usuarioId);

        return Ok(compras);
    }

    [Authorize(Roles = "CLIENTE")]
    [HttpGet("boletos")]
    public async Task<IActionResult> ObtenerBoletos()
    {
        var identificador = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!long.TryParse(identificador, out long usuarioId)
            || usuarioId <= 0)
        {
            return Unauthorized(new
            {
                mensaje = "No se pudo identificar al cliente."
            });
        }

        var boletos = await _clienteService
            .ObtenerBoletosClienteAsync(usuarioId);

        return Ok(boletos);
    }

    [Authorize(Roles = "CLIENTE")]
    [HttpGet("perfil")]
    public async Task<IActionResult> ObtenerPerfilReserva()
    {
        if (!long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var usuarioId) || usuarioId <= 0)
            return Unauthorized(new { mensaje = "No se pudo identificar al cliente." });

        var documento = await _reservasClienteService.ObtenerDocumentoAsync(usuarioId);
        return Ok(new { cedula = documento });
    }

    [Authorize(Roles = "CLIENTE")]
    [HttpPost("reservas")]
    public async Task<IActionResult> CrearReserva([FromBody] CrearReservaClienteRequest solicitud)
    {
        if (!long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var usuarioId) || usuarioId <= 0)
            return Unauthorized(new { mensaje = "No se pudo identificar al cliente." });

        try
        {
            var reserva = await _reservasClienteService.CrearAsync(usuarioId, solicitud);
            return Ok(reserva);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { mensaje = ex.Message });
        }
    }
}
