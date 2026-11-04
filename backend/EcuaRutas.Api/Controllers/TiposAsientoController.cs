using EcuaRutas.Api.DTOs;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/tipos-asiento")]
[Authorize(Roles = "ADMIN,COOPERATIVA,OFICINISTA")]
public class TiposAsientoController : ControllerBase
{
    private readonly IPlantillaService _servicio;

    public TiposAsientoController(IPlantillaService servicio)
    {
        _servicio = servicio;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TipoAsientoDto>>> Listar(
        [FromQuery] long? cooperativaId, CancellationToken ct)
    {
        return Ok(await _servicio.ListarTiposAsientoAsync(cooperativaId, ct));
    }
}
