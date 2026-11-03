
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

    public ClienteController(ClienteService clienteService)
    {
        _clienteService = clienteService;
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
}
