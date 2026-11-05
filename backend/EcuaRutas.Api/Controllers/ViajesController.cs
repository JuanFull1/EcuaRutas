using EcuaRutas.Api.DTOs.Viajes;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/viajes")]
[Authorize(Roles = RolesLectura)]
public class ViajesController : ControllerBase
{
    private const string RolesLectura = "COOPERATIVA,OFICINISTA";
    private const string RolesEscritura = "COOPERATIVA";

    private readonly IViajeService _service;

    public ViajesController(IViajeService service) => _service = service;

    [HttpGet]
    public Task<IActionResult> Listar(
        [FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta,
        [FromQuery] string? estado, [FromQuery] long? busId, CancellationToken ct)
        => Ejecutar(async () =>
            Ok(await _service.ListarAsync(User.ObtenerCooperativaContexto(), desde, hasta, estado, busId, ct)));

    [HttpGet("{id:long}")]
    public Task<IActionResult> Obtener(long id, CancellationToken ct)
        => Ejecutar(async () =>
            Ok(await _service.ObtenerPorIdAsync(id, User.ObtenerCooperativaContexto(), ct)));

    [HttpPost]
    [Authorize(Roles = RolesEscritura)]
    public Task<IActionResult> Crear(CrearViajeDto dto, CancellationToken ct)
        => Ejecutar(async () =>
        {
            var viaje = await _service.CrearAsync(dto, User.ObtenerCooperativaContexto(), ct);
            return CreatedAtAction(nameof(Obtener), new { id = viaje.Id }, viaje);
        });

    [HttpPatch("{id:long}/estado")]
    [Authorize(Roles = RolesEscritura)]
    public Task<IActionResult> ActualizarEstado(long id, ActualizarEstadoViajeDto dto, CancellationToken ct)
        => Ejecutar(async () =>
            Ok(await _service.ActualizarEstadoAsync(id, dto, User.ObtenerCooperativaContexto(), ct)));

    [HttpPut("{id:long}/usuario-bus")]
    [Authorize(Roles = RolesEscritura)]
    public Task<IActionResult> ReasignarUsuarioBus(long id, ReasignarUsuarioBusDto dto, CancellationToken ct)
        => Ejecutar(async () =>
            Ok(await _service.ReasignarUsuarioBusAsync(id, dto, User.ObtenerCooperativaContexto(), ct)));

    [HttpPost("{id:long}/cancelar")]
    [Authorize(Roles = RolesEscritura)]
    public Task<IActionResult> Cancelar(long id, CancellationToken ct)
        => Ejecutar(async () =>
            Ok(await _service.CancelarAsync(id, User.ObtenerCooperativaContexto(), ct)));

    [HttpPost("generar-desde-hoja/{hojaRutaId:long}")]
    [Authorize(Roles = RolesEscritura)]
    public Task<IActionResult> GenerarDesdeHoja(long hojaRutaId, CancellationToken ct)
        => Ejecutar(async () =>
        {
            var viajes = await _service.GenerarDesdeHojaRutaAsync(hojaRutaId, User.ObtenerCooperativaContexto(), ct);
            return StatusCode(StatusCodes.Status201Created, viajes);
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
