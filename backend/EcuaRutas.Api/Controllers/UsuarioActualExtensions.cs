using System.Security.Claims;
using EcuaRutas.Api.Services;

namespace EcuaRutas.Api.Controllers;

public static class UsuarioActualExtensions
{
    public const string ClaimCooperativa = "cooperativa_id";

    public static long? ObtenerCooperativaContexto(this ClaimsPrincipal user)
    {
        if (user.IsInRole("ADMIN")) return null;

        if (long.TryParse(user.FindFirstValue(ClaimCooperativa), out var id)) return id;

        throw new ReglaNegocioException(403, "El usuario no tiene una cooperativa asociada.");
    }
    public static long ObtenerUsuarioId(this ClaimsPrincipal user)
        => long.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
            ? id
            : throw new ReglaNegocioException(403, "No se pudo identificar al usuario autenticado.");
}