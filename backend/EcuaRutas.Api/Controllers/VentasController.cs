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

    [HttpPost("expirar")]
public async Task<IActionResult> ExpirarReservas()
{
    var cantidad = await _service.ExpirarReservasAsync();

    return Ok(new
    {
        mensaje = "Reservas expiradas correctamente.",
        cantidadExpirada = cantidad
    });
}

[HttpPost("{ventaId}/cancelar")]
public async Task<IActionResult> CancelarReserva(long ventaId)
{
    try
    {
        await _service.CancelarReservaAsync(ventaId);

        return Ok(new
        {
            mensaje = "Reserva cancelada correctamente.",
            ventaId
        });
    }
    catch (ArgumentException ex)
    {
        return NotFound(new
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

[HttpPost("{ventaId}/confirmar")]
public async Task<IActionResult> ConfirmarVenta(long ventaId)
{
    try
    {
        var resultado =
            await _service.ConfirmarVentaAsync(ventaId);

        return Ok(resultado);
    }
    catch (ArgumentException ex)
    {
        return NotFound(new
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