using System.Security.Claims;
using EcuaRutas.Api.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Xunit;

namespace EcuaRutas.Api.Tests.Controllers;

public class AlcanceCatalogosTests
{
    // Ejecuta el filtro real alrededor del servicio. No simula PostgreSQL ni JWT.
    internal static async Task EjecutarAsync(Func<Task> accion, string? claim = "11", string rol = "COOPERATIVA")
    {
        var contexto = CrearContexto(rol, claim);
        var invocada = false;
        await new CatalogosCooperativaAttribute().OnActionExecutionAsync(contexto, async () =>
        {
            invocada = true;
            await accion();
            return new ActionExecutedContext(contexto, [], new object());
        });
        Assert.True(invocada);
    }

    internal static ActionExecutingContext CrearContexto(string? rol, string? claim)
    {
        var claims = new List<Claim>();
        if (rol is not null) claims.Add(new Claim(ClaimTypes.Role, rol));
        if (claim is not null) claims.Add(new Claim("cooperativa_id", claim));
        var http = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, rol is null ? null : "prueba")) };
        return new ActionExecutingContext(new ActionContext(http, new RouteData(), new ActionDescriptor()), [], new Dictionary<string, object?>(), new object());
    }

    [Theory]
    [InlineData(null, null, 401)]
    [InlineData("CLIENTE", "11", 403)]
    [InlineData("OFICINISTA", "11", 403)]
    [InlineData("COOPERATIVA", null, 403)]
    [InlineData("COOPERATIVA", "0", 403)]
    [InlineData("COOPERATIVA", "-1", 403)]
    [InlineData("COOPERATIVA", "abc", 403)]
    [InlineData("COOPERATIVA", "9223372036854775808", 403)]
    public async Task CredencialesInvalidasNoEjecutanAccion(string? rol, string? claim, int estado)
    {
        var contexto = CrearContexto(rol, claim);
        await new CatalogosCooperativaAttribute().OnActionExecutionAsync(contexto, () => throw new InvalidOperationException("No debe ejecutar"));
        if (estado == 401) Assert.IsType<UnauthorizedResult>(contexto.Result);
        else Assert.IsType<ForbidResult>(contexto.Result);
    }

    [Fact]
    public async Task ClaimDuplicadoEsDenegado()
    {
        var contexto = CrearContexto("COOPERATIVA", "11");
        ((ClaimsIdentity)contexto.HttpContext.User.Identity!).AddClaim(new Claim("cooperativa_id", "12"));
        await new CatalogosCooperativaAttribute().OnActionExecutionAsync(contexto, () => throw new InvalidOperationException());
        Assert.IsType<ForbidResult>(contexto.Result);
    }
}
