
using System.Security.Claims;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/notificaciones")]
[Authorize(Roles = "CLIENTE")]
public class NotificacionesController : ControllerBase
{
    private readonly NotificacionesService _notificacionesService;

    public NotificacionesController(
        NotificacionesService notificacionesService)
    {
        _notificacionesService = notificacionesService;
    }

    // GET: api/notificaciones
    [HttpGet]
    public async Task<IActionResult> ObtenerMisNotificaciones()
    {
        var identificador = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!long.TryParse(identificador, out long usuarioId)
            || usuarioId <= 0)
        {
            return Unauthorized(new
            {
                mensaje = "No se pudo identificar al cliente."
            });
        }

        var notificaciones = await _notificacionesService
            .ObtenerPorUsuarioAsync(usuarioId);

        return Ok(notificaciones);
    }
}
