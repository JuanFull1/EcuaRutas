using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using EcuaRutas.Api.Controllers;
using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Frecuencias;
using EcuaRutas.Api.DTOs.ResolucionesAnt;
using EcuaRutas.Api.DTOs.Tarifas;
using EcuaRutas.Api.Models;
using EcuaRutas.Api.Security;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Npgsql;
using Xunit;

namespace EcuaRutas.Api.Tests.Controllers;

// Arranca el Program real mediante su entry point y Kestrel en loopback/puerto
// efímero. Usa JWT, MVC, binding, validación, rutas y middleware de producción.
// Solo sustituye la activación de estos tres controladores para entregar dobles;
// conserva los registros DI reales y elimina el worker que accedería a PostgreSQL.
// No requiere TestHost/Mvc.Testing ni conexiones o secretos del desarrollador.
public class CatalogosHttpTests : IClassFixture<CatalogosHttpFixture>
{
    private readonly CatalogosHttpFixture fixture;
    public CatalogosHttpTests(CatalogosHttpFixture fixture) => this.fixture = fixture;

    public static TheoryData<string, string, string?, int> Autorizacion
    {
        get
        {
            var casos = new TheoryData<string, string, string?, int>();
            foreach (var ruta in CatalogosHttpFixture.Rutas)
            foreach (var metodo in new[] { "GET", "POST", "PUT", "DELETE" })
            {
                casos.Add(ruta, metodo, null, 401);
                foreach (var rol in new[] { "CLIENTE", "COOPERATIVA", "OFICINISTA", "BUS" }) casos.Add(ruta, metodo, rol, 403);
                casos.Add(ruta, metodo, "ADMIN", metodo switch { "POST" => 201, "DELETE" => 204, _ => 200 });
            }
            return casos;
        }
    }

    [Theory]
    [MemberData(nameof(Autorizacion))]
    public async Task MiddlewareRealAplicaPoliticaAdmin(string ruta, string metodo, string? rol, int estado)
    {
        using var respuesta = await fixture.EnviarAsync(metodo, ruta, rol);
        Assert.Equal((HttpStatusCode)estado, respuesta.StatusCode);
    }

    [Theory]
    [InlineData("/api/resoluciones-ant", "/api/resoluciones-ant/7")]
    [InlineData("/api/frecuencias", "/api/frecuencias/7")]
    [InlineData("/api/frecuencias/11/tarifas", "/api/frecuencias/11/tarifas/7")]
    public async Task CreatedAtActionProduceUbicacionConsultable(string ruta, string ubicacion)
    {
        using var respuesta = await fixture.EnviarAsync("POST", ruta, "ADMIN");
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        Assert.Equal(ubicacion, respuesta.Headers.Location!.AbsolutePath);
        using var documento = JsonDocument.Parse(await respuesta.Content.ReadAsStringAsync());
        Assert.Equal(7, documento.RootElement.GetProperty("id").GetInt64());
        using var consulta = new HttpRequestMessage(HttpMethod.Get, respuesta.Headers.Location);
        consulta.Headers.Authorization = new AuthenticationHeaderValue("Bearer", fixture.Token("ADMIN"));
        using var obtenido = await fixture.Cliente.SendAsync(consulta);
        Assert.Equal(HttpStatusCode.OK, obtenido.StatusCode);
    }

    [Theory]
    [InlineData("/api/resoluciones-ant", "{}")]
    [InlineData("/api/frecuencias", "{\"cooperativaId\":1,\"rutaId\":2,\"resolucionAntId\":3}")]
    [InlineData("/api/frecuencias/11/tarifas", "{\"origenRutaParadaId\":90,\"destinoRutaParadaId\":10,\"precioBase\":1.001}")]
    [InlineData("/api/frecuencias/11/tarifas", "{\"origenRutaParadaId\":90,\"destinoRutaParadaId\":90,\"precioBase\":0}")]
    [InlineData("/api/resoluciones-ant", "null")]
    [InlineData("/api/frecuencias", "{")]
    public async Task ApiControllerValidaCuerpoAntesDelServicio(string ruta, string json)
    {
        using var respuesta = await fixture.EnviarAsync("POST", ruta, "ADMIN", json: json);
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        Assert.Equal("application/problem+json", respuesta.Content.Headers.ContentType!.MediaType);
    }

    [Theory]
    [InlineData("/api/resoluciones-ant")]
    [InlineData("/api/frecuencias")]
    [InlineData("/api/frecuencias/11/tarifas")]
    public async Task PutExigeEstadoExplicito(string ruta)
    {
        var sinEstado = CatalogosHttpFixture.Cuerpo(ruta, actualizar: false);
        using var respuesta = await fixture.EnviarAsync("PUT", ruta, "ADMIN", json: sinEstado);
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Theory]
    [InlineData("/api/resoluciones-ant/0")]
    [InlineData("/api/frecuencias/-1")]
    [InlineData("/api/frecuencias?cooperativaId=0")]
    [InlineData("/api/frecuencias?rutaId=-1")]
    [InlineData("/api/frecuencias/0/tarifas")]
    [InlineData("/api/frecuencias/11/tarifas/0")]
    public async Task IdentificadoresInvalidosDevuelven400(string ruta)
    {
        using var respuesta = await fixture.EnviarAsync("GET", ruta, "ADMIN", agregarId: false);
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Theory]
    [InlineData("GET")]
    [InlineData("PUT")]
    [InlineData("DELETE")]
    public async Task TarifaDeOtraFrecuenciaDevuelve404(string metodo)
    {
        var ruta = "/api/frecuencias/12/tarifas" + (metodo == "GET" ? "/7" : "");
        using var respuesta = await fixture.EnviarAsync(metodo, ruta, "ADMIN");
        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task JsonConservaMedianocheYEstadoFalse()
    {
        using var respuesta = await fixture.EnviarAsync("PUT", "/api/frecuencias", "ADMIN");
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        var dto = await respuesta.Content.ReadFromJsonAsync<FrecuenciaDto>();
        Assert.NotNull(dto); Assert.Equal(TimeOnly.MinValue, dto.HoraSalida); Assert.False(dto.Activa);
    }

    [Theory]
    [InlineData("/api/resoluciones-ant")]
    [InlineData("/api/frecuencias")]
    [InlineData("/api/frecuencias/11/tarifas")]
    public async Task JwtInvalidoEsRechazado(string ruta)
    {
        using var peticion = new HttpRequestMessage(HttpMethod.Post, ruta);
        peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", fixture.Token("ADMIN") + "alterado");
        peticion.Content = new StringContent(CatalogosHttpFixture.Cuerpo(ruta, false), Encoding.UTF8, "application/json");
        using var respuesta = await fixture.Cliente.SendAsync(peticion);
        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Theory]
    [InlineData("/api/resoluciones-ant")]
    [InlineData("/api/frecuencias")]
    [InlineData("/api/frecuencias/11/tarifas")]
    public async Task ErrorTecnicoEs500SinDetallesPostgres(string ruta)
    {
        // El doble falla únicamente para este cuerpo, sin afectar otras peticiones.
        var json = CatalogosHttpFixture.Cuerpo(ruta, false).Replace("\"cooperativaId\":1", "\"cooperativaId\":500")
            .Replace("\"precioBase\":0", "\"precioBase\":500");
        using var respuesta = await fixture.EnviarAsync("POST", ruta, "ADMIN", json: json);
        Assert.Equal(HttpStatusCode.InternalServerError, respuesta.StatusCode);
        var texto = await respuesta.Content.ReadAsStringAsync();
        Assert.DoesNotContain("detalle SQL privado", texto); Assert.DoesNotContain("Npgsql", texto);
    }

    [Theory]
    [InlineData("/api/resoluciones-ant/501")]
    [InlineData("/api/frecuencias/501")]
    [InlineData("/api/frecuencias/11/tarifas/501")]
    public async Task ErrorPostgresDuranteConsultaEs500SinDetalles(string ruta)
    {
        using var respuesta = await fixture.EnviarAsync("GET", ruta, "ADMIN");
        Assert.Equal(HttpStatusCode.InternalServerError, respuesta.StatusCode);
        var texto = await respuesta.Content.ReadAsStringAsync();
        Assert.DoesNotContain("detalle SQL privado", texto); Assert.DoesNotContain("Npgsql", texto);
    }

    [Theory]
    [InlineData("/api/resoluciones-ant", 404)]
    [InlineData("/api/resoluciones-ant", 409)]
    [InlineData("/api/frecuencias", 404)]
    [InlineData("/api/frecuencias", 409)]
    [InlineData("/api/frecuencias/11/tarifas", 404)]
    [InlineData("/api/frecuencias/11/tarifas", 409)]
    public async Task ErroresDeNegocioConservanCodigoHttp(string ruta, int estado)
    {
        var marcador = estado.ToString(System.Globalization.CultureInfo.InvariantCulture);
        var json = CatalogosHttpFixture.Cuerpo(ruta, false).Replace("\"cooperativaId\":1", "\"cooperativaId\":" + marcador)
            .Replace("\"precioBase\":0", "\"precioBase\":" + marcador);
        using var respuesta = await fixture.EnviarAsync("POST", ruta, "ADMIN", json: json);
        Assert.Equal((HttpStatusCode)estado, respuesta.StatusCode);
    }

    [Fact]
    public void ProgramRegistraLosTresServiciosScopedYJwtReconoceRoleClaimType()
    {
        using var scope = fixture.Host.Services.CreateScope(); var servicios = scope.ServiceProvider;
        Assert.IsType<ResolucionAntService>(servicios.GetRequiredService<IResolucionAntService>());
        Assert.IsType<FrecuenciaService>(servicios.GetRequiredService<IFrecuenciaService>());
        Assert.IsType<TarifaFrecuenciaService>(servicios.GetRequiredService<ITarifaFrecuenciaService>());
        Assert.Same(servicios.GetRequiredService<IFrecuenciaService>(), servicios.GetRequiredService<IFrecuenciaService>());
        using var otroScope = fixture.Host.Services.CreateScope();
        Assert.NotSame(servicios.GetRequiredService<IFrecuenciaService>(), otroScope.ServiceProvider.GetRequiredService<IFrecuenciaService>());
        Assert.Equal(3, fixture.RegistrosComprobados);
        var opciones = servicios.GetRequiredService<IOptionsMonitor<JwtBearerOptions>>().Get(JwtBearerDefaults.AuthenticationScheme);
        Assert.Equal(ClaimTypes.Role, opciones.TokenValidationParameters.RoleClaimType);
        Assert.True(opciones.MapInboundClaims);
        Assert.Equal(System.Data.ConnectionState.Closed, servicios.GetRequiredService<EcuaRutasDbContext>().Database.GetDbConnection().State);
    }
}

public sealed class CatalogosHttpFixture : IAsyncLifetime, IObserver<DiagnosticListener>, IObserver<KeyValuePair<string, object?>>
{
    public static readonly string[] Rutas = ["/api/resoluciones-ant", "/api/frecuencias", "/api/frecuencias/11/tarifas"];
    private const string Clave = "clave-exclusiva-para-pruebas-http-locales-de-catalogos-2026";
    private readonly TaskCompletionSource<IHost> construido = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly List<IDisposable> suscripciones = [];
    private Task? ejecucion;
    public IHost Host { get; private set; } = null!;
    public HttpClient Cliente { get; private set; } = null!;
    public int RegistrosComprobados { get; private set; }

    public async Task InitializeAsync()
    {
        suscripciones.Add(DiagnosticListener.AllListeners.Subscribe(this));
        ejecucion = Task.Run(async () =>
        {
            try
            {
                var entry = typeof(FrecuenciasController).Assembly.EntryPoint!;
                string[] argumentos = ["--environment=Testing", "--applicationName=EcuaRutas.Api", "--urls=http://127.0.0.1:0",
                    $"--Jwt:Key={Clave}", "--Jwt:Issuer=pruebas", "--Jwt:Audience=pruebas", "--Logging:LogLevel:Default=None",
                    "--ConnectionStrings:DefaultConnection=Host=127.0.0.1;Port=1;Database=sin_conexion;Username=prueba"];
                var resultado = entry.Invoke(null, [argumentos]);
                if (resultado is Task tarea) await tarea;
            }
            catch (Exception ex) { construido.TrySetException(ex); throw; }
        });
        Host = await construido.Task.WaitAsync(TimeSpan.FromSeconds(30));
        var iniciado = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var registro = Host.Services.GetRequiredService<IHostApplicationLifetime>().ApplicationStarted.Register(() => iniciado.TrySetResult());
        await Task.WhenAny(iniciado.Task, ejecucion).WaitAsync(TimeSpan.FromSeconds(30));
        if (ejecucion.IsCompleted) await ejecucion;
        await iniciado.Task.WaitAsync(TimeSpan.FromSeconds(30));
        var direcciones = Host.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!;
        Cliente = new HttpClient { BaseAddress = new Uri(Assert.Single(direcciones.Addresses)), Timeout = TimeSpan.FromSeconds(15) };
    }

    public string Token(string rol) => Host.Services.GetRequiredService<JwtService>().GenerarToken(new Usuario
    { Id = 1, Nombres = "Prueba", Apellidos = "HTTP", Correo = "prueba@example.invalid", Rol = new Role { Codigo = rol } }).Token;

    public static string Cuerpo(string ruta, bool actualizar)
    {
        var campos = ruta.Contains("tarifas", StringComparison.Ordinal)
            ? "\"origenRutaParadaId\":90,\"destinoRutaParadaId\":10,\"precioBase\":0"
            : ruta.Contains("resoluciones-ant", StringComparison.Ordinal)
                ? "\"cooperativaId\":1,\"numeroResolucion\":\"ANT-01\""
                : "\"cooperativaId\":1,\"rutaId\":2,\"resolucionAntId\":3,\"horaSalida\":\"00:00:00\"";
        return "{" + campos + (actualizar ? ",\"activa\":false" : "") + "}";
    }

    public async Task<HttpResponseMessage> EnviarAsync(string metodo, string ruta, string? rol, string? json = null, bool agregarId = true)
    {
        var destino = agregarId && metodo is "PUT" or "DELETE" ? ruta + "/7" : ruta;
        // GET de la matriz comprueba el listado; otras pruebas usan rutas individuales explícitas.
        using var peticion = new HttpRequestMessage(new HttpMethod(metodo), destino);
        if (rol is not null) peticion.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Token(rol));
        if (metodo is "POST" or "PUT") peticion.Content = new StringContent(json ?? Cuerpo(ruta, metodo == "PUT"), Encoding.UTF8, "application/json");
        return await Cliente.SendAsync(peticion);
    }

    public void OnNext(DiagnosticListener value)
    {
        if (value.Name == "Microsoft.Extensions.Hosting") suscripciones.Add(value.Subscribe(this));
    }

    public void OnNext(KeyValuePair<string, object?> value)
    {
        if (value.Key == "HostBuilding" && value.Value is IHostBuilder builder)
            builder.ConfigureServices((_, servicios) =>
            {
                foreach (var tipo in new[] { typeof(IResolucionAntService), typeof(IFrecuenciaService), typeof(ITarifaFrecuenciaService) })
                {
                    var descriptor = Assert.Single(servicios, d => d.ServiceType == tipo);
                    Assert.Equal(ServiceLifetime.Scoped, descriptor.Lifetime); RegistrosComprobados++;
                }
                foreach (var worker in servicios.Where(d => d.ServiceType == typeof(IHostedService)
                    && d.ImplementationType == typeof(ReservasExpirationWorker)).ToArray()) servicios.Remove(worker);
                servicios.AddSingleton<IControllerActivator>(new ActivadorSimulado());
            });
        if (value.Key == "HostBuilt" && value.Value is IHost host) construido.TrySetResult(host);
    }

    public void OnCompleted() { }
    public void OnError(Exception error) => construido.TrySetException(error);

    public async Task DisposeAsync()
    {
        Cliente?.Dispose();
        if (Host is not null) await Host.StopAsync(TimeSpan.FromSeconds(10));
        if (ejecucion is not null) await ejecucion.WaitAsync(TimeSpan.FromSeconds(15));
        foreach (var suscripcion in suscripciones) suscripcion.Dispose();
    }

    private sealed class ActivadorSimulado : IControllerActivator
    {
        public object Create(ControllerContext context)
        {
            var tipo = context.ActionDescriptor.ControllerTypeInfo.AsType();
            if (tipo == typeof(ResolucionesAntController))
            {
                var (servicio, doble) = ServicioDoble<IResolucionAntService>.Crear();
                var dto = new ResolucionAntDto { Id = 7, CooperativaId = 1, NumeroResolucion = "ANT-01", Activa = false };
                Configurar(doble, dto, new[] { dto }); return new ResolucionesAntController(servicio);
            }
            if (tipo == typeof(FrecuenciasController))
            {
                var (servicio, doble) = ServicioDoble<IFrecuenciaService>.Crear();
                var dto = new FrecuenciaDto { Id = 7, CooperativaId = 1, RutaId = 2, ResolucionAntId = 3, HoraSalida = TimeOnly.MinValue, Activa = false };
                Configurar(doble, dto, new[] { dto }); return new FrecuenciasController(servicio);
            }
            if (tipo == typeof(TarifasFrecuenciaController))
            {
                var (servicio, doble) = ServicioDoble<ITarifaFrecuenciaService>.Crear();
                var dto = new TarifaFrecuenciaDto { Id = 7, FrecuenciaId = 11, OrigenRutaParadaId = 90, DestinoRutaParadaId = 10, PrecioBase = 0m, Activa = false };
                Configurar(doble, dto, new[] { dto }); return new TarifasFrecuenciaController(servicio);
            }
            return ActivatorUtilities.CreateInstance(context.HttpContext.RequestServices, tipo);
        }

        private static void Configurar<T, TDto>(ServicioDoble<T> doble, TDto dto, TDto[] lista) where T : class
        {
            doble.Respuestas["ListarAsync"] = lista; doble.Respuestas["ListarPorFrecuenciaAsync"] = lista;
            doble.Respuestas["ObtenerAsync"] = dto; doble.Respuestas["CrearAsync"] = dto;
            doble.Respuestas["ActualizarAsync"] = dto; doble.Respuestas["DarDeBajaAsync"] = true;
            doble.AlInvocar = (_, argumentos) =>
            {
                if (argumentos.Contains(501L)) throw new PostgresException("detalle SQL privado", "ERROR", "ERROR", "XX000");
                var marcador = argumentos.Select(a => a switch
                {
                    CrearResolucionAntDto resolucion => (decimal)resolucion.CooperativaId,
                    CrearFrecuenciaDto frecuencia => (decimal)frecuencia.CooperativaId,
                    CrearTarifaFrecuenciaDto tarifa => tarifa.PrecioBase ?? 0m,
                    _ => 0m
                }).FirstOrDefault(valor => valor is 404m or 409m);
                if (marcador == 404m) throw new RecursoNoEncontradoException("Referencia inexistente.");
                if (marcador == 409m) throw new ConflictoException("Conflicto de negocio.");
                if (argumentos.Any(a => a is CrearResolucionAntDto { CooperativaId: 500 }
                    or CrearFrecuenciaDto { CooperativaId: 500 } or CrearTarifaFrecuenciaDto { PrecioBase: 500m }))
                    throw new DbUpdateException("detalle SQL privado");
            };
        }

        public void Release(ControllerContext context, object controller)
        { if (controller is IDisposable disposable) disposable.Dispose(); }
    }
}
