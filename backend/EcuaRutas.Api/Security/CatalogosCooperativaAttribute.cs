using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace EcuaRutas.Api.Security;

/// <summary>
/// Alcance exclusivo de los tres catálogos privados. No modifica JWT ni DI global.
/// AsyncLocal propaga el alcance durante la acción y lo aísla entre solicitudes.
/// Los consumidores internos sin este filtro conservan el alcance global anterior.
/// </summary>
[AttributeUsage(AttributeTargets.Class)]
public sealed class CatalogosCooperativaAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var usuario = context.HttpContext.User;
        if (usuario.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        long? cooperativaId = null;
        if (!usuario.IsInRole("ADMIN"))
        {
            var claims = usuario.FindAll("cooperativa_id").ToArray();
            if (!usuario.IsInRole("COOPERATIVA") || claims.Length != 1
                || !long.TryParse(claims[0].Value, NumberStyles.None, CultureInfo.InvariantCulture, out var id) || id <= 0)
            {
                context.Result = new ForbidResult();
                return;
            }
            cooperativaId = id;
        }

        var anterior = AlcanceCatalogos.CooperativaId;
        try
        {
            AlcanceCatalogos.CooperativaId = cooperativaId;
            await next();
        }
        finally { AlcanceCatalogos.CooperativaId = anterior; }
    }
}

internal static class AlcanceCatalogos
{
    private static readonly AsyncLocal<long?> Actual = new();
    internal static long? CooperativaId { get => Actual.Value; set => Actual.Value = value; }
    internal static bool Permite(long cooperativaId) => CooperativaId is not long propia || propia == cooperativaId;
    internal static void ExigirPropia(long cooperativaId)
    {
        if (!Permite(cooperativaId)) throw new UnauthorizedAccessException();
    }
}
