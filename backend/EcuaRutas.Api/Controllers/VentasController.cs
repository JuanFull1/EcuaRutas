using EcuaRutas.Api.DTOs.Ventas;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VentasController : ControllerBase
{
    private readonly VentasService _service;

    public VentasController(VentasService service)
    {
        _service = service;
    }

    [HttpPost("reservar")]
    public async Task<IActionResult> Reservar(
        [FromBody] CrearReservaRequest request)
    {
        try
        {
            var resultado =
                await _service.CrearReservaAsync(request);

            return Ok(resultado);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                mensaje = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                mensaje = ex.Message
            });
        }
    }
}