
using EcuaRutas.Api.DTOs.Cliente;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Mvc;

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
}
