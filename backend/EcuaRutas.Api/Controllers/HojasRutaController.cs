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

    [HttpPost("automatica")]
    [Authorize(Roles = RolesEscritura)]
    public Task<IActionResult> GenerarAutomatica(GenerarHojasRutaAutomaticaDto dto, CancellationToken ct)
        => Ejecutar(async () =>
        {
            var hojas = await _service.GenerarAutomaticaAsync(dto, User.ObtenerCooperativaContexto(), ct);
            return StatusCode(StatusCodes.Status201Created, hojas);
        });

    [HttpPost("{id:long}/publicar")]
    [Authorize(Roles = RolesEscritura)]
    public Task<IActionResult> Publicar(long id, CancellationToken ct)
        => Ejecutar(async () =>
            Ok(await _service.PublicarAsync(id, User.ObtenerCooperativaContexto(), ct)));

    [HttpPost("{id:long}/cerrar")]
    [Authorize(Roles = RolesEscritura)]
    public Task<IActionResult> Cerrar(long id, CancellationToken ct)
        => Ejecutar(async () =>
            Ok(await _service.CerrarAsync(id, User.ObtenerCooperativaContexto(), ct)));

    [HttpPost("{id:long}/detalles/{detalleId:long}/sustituir-bus")]
    [Authorize(Roles = RolesEscritura)]
    public Task<IActionResult> SustituirBus(long id, long detalleId, SustituirBusDto dto, CancellationToken ct)
        => Ejecutar(async () =>
            Ok(await _service.SustituirBusAsync(id, detalleId, dto, User.ObtenerCooperativaContexto(), ct)));

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