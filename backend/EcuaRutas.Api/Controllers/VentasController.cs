using System.Security.Claims;
using EcuaRutas.Api.DTOs.Ventas;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "OFICINISTA")]
public class VentasController : ControllerBase
{
    private readonly VentasService _service;

    public VentasController(VentasService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> BuscarVentas(
        [FromQuery] string? busqueda,
        [FromQuery] string? estado,
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] int pagina = 1,
        [FromQuery] int tamanoPagina = 20)
    {
        if (desde.HasValue && hasta.HasValue && desde.Value.Date > hasta.Value.Date)
        {
            return BadRequest(new { mensaje = "La fecha inicial no puede ser posterior a la fecha final." });
        }

        var respuesta = await _service.BuscarVentasAsync(
            busqueda, estado, desde, hasta, pagina, tamanoPagina);
        return Ok(respuesta);
    }

    [HttpGet("pasajeros/documento/{documento}")]
    public async Task<IActionResult> ObtenerPasajeroPorDocumento(string documento)
    {
        try
        {
            var pasajero = await _service.ObtenerPasajeroPorDocumentoAsync(documento);
            return pasajero == null
                ? NotFound(new { mensaje = "No existe un pasajero con ese documento." })
                : Ok(pasajero);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
    }

    [HttpPost("reservar")]
    public async Task<IActionResult> Reservar(
        [FromBody] CrearReservaRequest request)
    {
        try
        {
            if (!long.TryParse(
                User.FindFirstValue(ClaimTypes.NameIdentifier),
                out var vendedorId))
            {
                return Unauthorized(new { mensaje = "Usuario de oficina no válido." });
            }

            request.UsuarioVendedorId = vendedorId;
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
        if (!long.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out var vendedorId))
        {
            return Unauthorized(new { mensaje = "Usuario de oficina no válido." });
        }

        var resultado =
            await _service.ConfirmarVentaAsync(ventaId, vendedorId);

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

[HttpGet("codigo/{codigo}")]
public async Task<IActionResult> ObtenerVentaPorCodigo(string codigo)
{
    try
    {
        var resultado =
            await _service.ObtenerVentaPorCodigoAsync(codigo);

        return Ok(resultado);
    }
    catch (ArgumentException ex)
    {
        return NotFound(new
        {
            mensaje = ex.Message
        });
    }
}
}
