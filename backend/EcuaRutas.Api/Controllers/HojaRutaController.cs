using EcuaRutas.Api.DTOs.HojasRuta;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/hojas-ruta")]
[Authorize(Roles = RolesLectura)]
public class HojasRutaController : ControllerBase
{
    private const string RolesLectura = "ADMIN,COOPERATIVA,OFICINISTA";
    private const string RolesEscritura = "ADMIN,COOPERATIVA";

    private readonly IHojaRutaService _service;

    public HojasRutaController(IHojaRutaService service) => _service = service;

    [HttpGet]
    public Task<IActionResult> Listar(
        [FromQuery] long? grupoBusId, [FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta,
        CancellationToken ct)
        => Ejecutar(async () =>
            Ok(await _service.ListarAsync(User.ObtenerCooperativaContexto(), grupoBusId, desde, hasta, ct)));

    [HttpGet("{id:long}")]
    public Task<IActionResult> Obtener(long id, CancellationToken ct)
        => Ejecutar(async () =>
            Ok(await _service.ObtenerPorIdAsync(id, User.ObtenerCooperativaContexto(), ct)));

    [HttpPost("manual")]
    [Authorize(Roles = RolesEscritura)]
    public Task<IActionResult> CrearManual(CrearHojaRutaManualDto dto, CancellationToken ct)
        => Ejecutar(async () =>
        {
            var hoja = await _service.CrearManualAsync(dto, User.ObtenerCooperativaContexto(), ct);
            return CreatedAtAction(nameof(Obtener), new { id = hoja.Id }, hoja);
        });



    private async Task<IActionResult> Ejecutar(Func<Task<IActionResult>> accion)
    {
        try
        {
            return await accion();
        }
        catch (ReglaNegocioException ex)
        {
            return StatusCode(ex.StatusCode, new { mensaje = ex.Message });
        }
    }
}