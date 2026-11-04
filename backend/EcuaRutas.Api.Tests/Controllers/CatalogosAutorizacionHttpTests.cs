using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using EcuaRutas.Api.Controllers;
using EcuaRutas.Api.DTOs.Frecuencias;
using EcuaRutas.Api.DTOs.ResolucionesAnt;
using EcuaRutas.Api.DTOs.Rutas;
using EcuaRutas.Api.DTOs.Tarifas;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace EcuaRutas.Api.Tests.Controllers;

// Servidor HTTP aislado: JWT, MVC, filtros y controladores reales; servicios dobles.
// No ejecuta Program ni sustituye su prueba de integración. No conecta a PostgreSQL.
public class CatalogosAutorizacionHttpTests : IClassFixture<CatalogosAutorizacionHttpFixture>
{
    private readonly CatalogosAutorizacionHttpFixture fixture;
    public CatalogosAutorizacionHttpTests(CatalogosAutorizacionHttpFixture fixture) => this.fixture = fixture;

    public static TheoryData<string, string, string?, int> Permisos
    {
        get
        {
            var datos = new TheoryData<string, string, string?, int>();
            foreach (var ruta in CatalogosAutorizacionHttpFixture.Privadas)
            foreach (var metodo in new[] { "GET", "POST", "PUT", "DELETE" })
            {
                datos.Add(ruta, metodo, null, 401);
                foreach (var rol in new[] { "CLIENTE", "OFICINISTA" }) datos.Add(ruta, metodo, rol, 403);
                foreach (var rol in new[] { "ADMIN", "COOPERATIVA" })
                    datos.Add(ruta, metodo, rol, metodo switch { "POST" => 201, "DELETE" => 204, _ => 200 });
            }
            return datos;
        }
    }

    [Theory]
    [MemberData(nameof(Permisos))]
    public async Task MiddlewareJwtYFiltrosAplicanPermisos(string ruta, string metodo, string? rol, int estado)
    {
        using var respuesta = await fixture.EnviarAsync(metodo, ruta, rol);
        Assert.Equal((HttpStatusCode)estado, respuesta.StatusCode);
    }

    public static TheoryData<string, string, string?> ClaimsInvalidos
    {
        get
        {
            var datos = new TheoryData<string, string, string?>();
            foreach (var ruta in CatalogosAutorizacionHttpFixture.Privadas)
            foreach (var metodo in new[] { "GET", "POST", "PUT", "DELETE" })
            foreach (var claim in new string?[] { null, "0", "-1", "abc", "9223372036854775808" })
                datos.Add(ruta, metodo, claim);
            return datos;
        }
    }

    [Theory]
    [MemberData(nameof(ClaimsInvalidos))]
    public async Task ClaimFaltanteOInvalidoDevuelve403(string ruta, string metodo, string? claim)
    {
        using var respuesta = await fixture.EnviarAsync(metodo, ruta, "COOPERATIVA", claim);
        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }

    [Theory]
    [InlineData("/api/lugares")]
    [InlineData("/api/rutas")]
    [InlineData("/api/rutas/2/paradas")]
    public async Task CatalogosGeograficosConservanConsultasPublicasYEscriturasAdmin(string ruta)
    {
        foreach (var rol in new string?[] { null, "COOPERATIVA", "CLIENTE", "OFICINISTA", "ADMIN" })
        {
            using var consulta = await fixture.EnviarAsync("GET", ruta, rol);
            Assert.Equal(HttpStatusCode.OK, consulta.StatusCode);
        }
        foreach (var metodo in new[] { "POST", "PUT", "DELETE" })
        foreach (var rol in new string?[] { null, "COOPERATIVA", "CLIENTE", "OFICINISTA" })
        {
            using var escritura = await fixture.EnviarAsync(metodo, ruta, rol);
            Assert.Equal(rol is null ? HttpStatusCode.Unauthorized : HttpStatusCode.Forbidden, escritura.StatusCode);
        }
    }
}

public sealed class CatalogosAutorizacionHttpFixture : IAsyncLifetime
{
    internal static readonly string[] Privadas = ["/api/resoluciones-ant", "/api/frecuencias", "/api/frecuencias/11/tarifas"];
    private const string Clave = "clave-local-aislada-exclusiva-pruebas-autorizacion-cooperativa-2026";
    private WebApplication app = null!;
    private HttpClient cliente = null!;

    public async Task InitializeAsync()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing" });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();
        builder.Services.AddControllers().AddApplicationPart(typeof(FrecuenciasController).Assembly);
        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
                ValidIssuer = "pruebas", ValidAudience = "pruebas", ClockSkew = TimeSpan.Zero,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Clave))
            };
        });
        builder.Services.AddAuthorization();
        Registrar<IResolucionAntService, ResolucionAntDto>(builder.Services, new() { Id = 7, CooperativaId = 1 });
        Registrar<IFrecuenciaService, FrecuenciaDto>(builder.Services, new() { Id = 7, CooperativaId = 1 });
        Registrar<ITarifaFrecuenciaService, TarifaFrecuenciaDto>(builder.Services, new() { Id = 7, FrecuenciaId = 11 });
        Registrar<ILugarService, LugarDto>(builder.Services, new());
        Registrar<IRutaService, RutaDto>(builder.Services, new());
        Registrar<IRutaParadaService, RutaParadaDto>(builder.Services, new());
        app = builder.Build();
        app.UseAuthentication(); app.UseAuthorization(); app.MapControllers();
        await app.StartAsync();
        var direcciones = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!;
        cliente = new HttpClient { BaseAddress = new Uri(Assert.Single(direcciones.Addresses)), Timeout = TimeSpan.FromSeconds(15) };
    }

    private static void Registrar<TServicio, TDto>(IServiceCollection servicios, TDto dto) where TServicio : class
    {
        servicios.AddScoped<TServicio>(_ =>
        {
            var (servicio, doble) = ServicioDoble<TServicio>.Crear();
            doble.Respuestas["ListarAsync"] = new[] { dto }; doble.Respuestas["ListarPorFrecuenciaAsync"] = new[] { dto };
            doble.Respuestas["ObtenerAsync"] = dto; doble.Respuestas["CrearAsync"] = dto;
            doble.Respuestas["ActualizarAsync"] = dto; doble.Respuestas["DarDeBajaAsync"] = true;
            return servicio;
        });
    }

    internal async Task<HttpResponseMessage> EnviarAsync(string metodo, string ruta, string? rol, string? claim = "1")
    {
        var destino = metodo is "PUT" or "DELETE" ? ruta + "/7" : ruta;
        using var peticion = new HttpRequestMessage(new HttpMethod(metodo), destino);
        if (rol is not null)
        {
            var claims = new List<Claim> { new(ClaimTypes.Role, rol) };
            if (claim is not null) claims.Add(new Claim("cooperativa_id", claim));
            var token = new JwtSecurityToken("pruebas", "pruebas", claims, expires: DateTime.UtcNow.AddMinutes(5),
                signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Clave)), SecurityAlgorithms.HmacSha256));
            peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", new JwtSecurityTokenHandler().WriteToken(token));
        }
        if (metodo is "POST" or "PUT")
        {
            var campos = ruta.Contains("tarifas", StringComparison.Ordinal)
                ? "\"origenRutaParadaId\":90,\"destinoRutaParadaId\":10,\"precioBase\":0"
                : ruta.Contains("resoluciones-ant", StringComparison.Ordinal)
                    ? "\"cooperativaId\":1,\"numeroResolucion\":\"ANT-01\""
                    : "\"cooperativaId\":1,\"rutaId\":2,\"resolucionAntId\":3,\"horaSalida\":\"00:00:00\"";
            peticion.Content = new StringContent("{" + campos + (metodo == "PUT" ? ",\"activa\":false" : "") + "}", Encoding.UTF8, "application/json");
        }
        return await cliente.SendAsync(peticion);
    }

    public async Task DisposeAsync()
    {
        cliente?.Dispose();
        if (app is not null) await app.DisposeAsync();
    }
}
