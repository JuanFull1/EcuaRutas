using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DisponibilidadController : ControllerBase
{
    private readonly DisponibilidadService _service;
    private readonly VentasService _ventasService;

    public DisponibilidadController(
        DisponibilidadService service,
        VentasService ventasService)
    {
        _service = service;
        _ventasService = ventasService;
    }

    [HttpGet]
    public async Task<IActionResult> Consultar(
        [FromQuery] long viajeId,
        [FromQuery] long origenRutaParadaId,
        [FromQuery] long destinoRutaParadaId)
    {
        if (viajeId <= 0)
        {
            return BadRequest("El viajeId debe ser mayor que cero.");
        }

        if (origenRutaParadaId <= 0)
        {
            return BadRequest(
                "El origenRutaParadaId debe ser mayor que cero.");
        }

        if (destinoRutaParadaId <= 0)
        {
            return BadRequest(
                "El destinoRutaParadaId debe ser mayor que cero.");
        }

        await _ventasService.ExpirarReservasAsync();

        var resultado = await _service.ConsultarAsync(
            viajeId,
            origenRutaParadaId,
            destinoRutaParadaId);

        if (resultado == null)
        {
            return NotFound(
                "No se encontró el viaje, las paradas no son válidas o no existe una tarifa activa para el tramo indicado.");
        }

        return Ok(resultado);
    }

    [HttpGet("lugares")]
public async Task<IActionResult> ObtenerLugares()
{
    var lugares =
        await _service.ObtenerLugaresAsync();

    return Ok(lugares);
}

[HttpGet("viajes")]
public async Task<IActionResult> BuscarViajes(
    [FromQuery] long origenLugarId,
    [FromQuery] long destinoLugarId,
    [FromQuery] DateTime fecha)
{
    try
    {
        var viajes =
            await _service.BuscarViajesAsync(
                origenLugarId,
                destinoLugarId,
                fecha);

        return Ok(viajes);
    }
    catch (ArgumentException ex)
    {
        return BadRequest(new
        {
            mensaje = ex.Message
        });
    }
}
}
