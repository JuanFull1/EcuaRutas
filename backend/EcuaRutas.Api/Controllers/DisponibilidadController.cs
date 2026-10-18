using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DisponibilidadController : ControllerBase
{
    private readonly DisponibilidadService _service;

    public DisponibilidadController(
        DisponibilidadService service)
    {
        _service = service;
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
}