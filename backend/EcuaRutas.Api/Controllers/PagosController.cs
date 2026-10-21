
using System.Security.Claims;
using EcuaRutas.Api.DTOs.Pagos;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/pagos")]
[Authorize(Roles = "CLIENTE")]
public class PagosController : ControllerBase
{
    private readonly PagosService _pagosService;

    public PagosController(PagosService pagosService)
    {
        _pagosService = pagosService;
    }

    [HttpPost]
    public async Task<IActionResult> RegistrarPago(
        [FromBody] RegistrarPagoDto dto)
    {
        var usuarioClaim = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!long.TryParse(usuarioClaim, out var usuarioId))
        {
            return Unauthorized(new
            {
                mensaje = "Usuario no válido."
            });
        }

        try
        {
            var pago = await _pagosService.RegistrarPagoAsync(
                dto, usuarioId);

            return Ok(new
            {
                mensaje = "Pago registrado correctamente.",
                pagoId = pago.Id,
                ventaId = pago.VentaId,
                metodo = pago.Metodo,
                monto = pago.Monto,
                estado = pago.Estado
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensaje = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
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

[HttpGet("venta/{ventaId:long}")]
public async Task<IActionResult> ObtenerPagosPorVenta(long ventaId)
{
    var usuarioIdTexto = User.FindFirst(
        ClaimTypes.NameIdentifier)?.Value;

    if (!long.TryParse(usuarioIdTexto, out var usuarioId))
    {
        return Unauthorized();
    }

    try
    {
        var pagos = await _pagosService
            .ObtenerPagosPorVentaAsync(ventaId, usuarioId);

        return Ok(pagos);
    }
    catch (KeyNotFoundException ex)
    {
        return NotFound(new { mensaje = ex.Message });
    }
    catch (UnauthorizedAccessException)
    {
        return Forbid();
    }
    catch (ArgumentException ex)
    {
        return BadRequest(new { mensaje = ex.Message });
    }
}

    [HttpPost("{pagoId:long}/comprobante")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> SubirComprobante(
        long pagoId,
        [FromForm] IFormFile archivo)
    {
        var usuarioClaim = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!long.TryParse(usuarioClaim, out var usuarioId))
        {
            return Unauthorized(new
            {
                mensaje = "Usuario no válido."
            });
        }

        try
        {
            var pago = await _pagosService.SubirComprobanteAsync(
                pagoId, usuarioId, archivo);

            return Ok(new
            {
                mensaje = "Comprobante enviado para revisión.",
                pago
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensaje = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
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
