using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.Controllers;
using EcuaRutas.Api.DTOs.Tarifas;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace EcuaRutas.Api.Tests.Controllers;

public class TarifasFrecuenciaControllerTests
{
    private static CrearTarifaFrecuenciaDto CrearDto() => new() { OrigenRutaParadaId = 90, DestinoRutaParadaId = 10, PrecioBase = 0m };
    private static ActualizarTarifaFrecuenciaDto EditarDto() => new() { OrigenRutaParadaId = 90, DestinoRutaParadaId = 10, PrecioBase = 0m, Activa = false };

    [Fact]
    public async Task OperacionesContextualesDevuelvenDtoUbicacionYPropaganToken()
    {
        var (servicio, doble) = ServicioDoble<ITarifaFrecuenciaService>.Crear();
        var dto = new TarifaFrecuenciaDto { Id = 7, FrecuenciaId = 11, PrecioBase = 0m, Activa = false };
        doble.Respuestas[nameof(servicio.ListarPorFrecuenciaAsync)] = new[] { dto }; doble.Respuestas[nameof(servicio.ObtenerAsync)] = dto;
        doble.Respuestas[nameof(servicio.CrearAsync)] = dto; doble.Respuestas[nameof(servicio.ActualizarAsync)] = dto;
        doble.Respuestas[nameof(servicio.DarDeBajaAsync)] = true;
        var controller = new TarifasFrecuenciaController(servicio); using var fuente = new CancellationTokenSource(); var ct = fuente.Token;
        Assert.IsType<OkObjectResult>(await controller.Listar(11, ct));
        Assert.Equal(11L, doble.Llamadas[0].Argumentos[0]);
        Assert.Same(dto, Assert.IsType<OkObjectResult>(await controller.Obtener(11, 7, ct)).Value);
        var creado = Assert.IsType<CreatedAtActionResult>(await controller.Crear(11, CrearDto(), ct));
        Assert.Equal(nameof(controller.Obtener), creado.ActionName); Assert.Equal(7L, creado.RouteValues!["id"]);
        Assert.Equal(11L, creado.RouteValues["frecuenciaId"]); Assert.Same(dto, creado.Value);
        Assert.Same(dto, Assert.IsType<OkObjectResult>(await controller.Actualizar(11, 7, EditarDto(), ct)).Value);
        Assert.IsType<NoContentResult>(await controller.DarDeBaja(11, 7, ct)); doble.ComprobarTokens(ct);
        Assert.DoesNotContain(doble.Llamadas, l => l.Metodo == nameof(servicio.ListarAsync));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task TarifaAjenaOInexistenteDevuelve404SinModificar(bool ajena)
    {
        var (servicio, doble) = ServicioDoble<ITarifaFrecuenciaService>.Crear();
        if (ajena) doble.Respuestas[nameof(servicio.ObtenerAsync)] = new TarifaFrecuenciaDto { Id = 7, FrecuenciaId = 12 };
        var controller = new TarifasFrecuenciaController(servicio);
        Assert.IsType<NotFoundResult>(await controller.Obtener(11, 7, default));
        Assert.IsType<NotFoundResult>(await controller.Actualizar(11, 7, EditarDto(), default));
        Assert.IsType<NotFoundResult>(await controller.DarDeBaja(11, 7, default));
        Assert.All(doble.Llamadas, l => Assert.Equal(nameof(servicio.ObtenerAsync), l.Metodo));
    }

    [Fact]
    public async Task AusenciaTrasComprobacionContextualDevuelve404()
    {
        var (servicio, doble) = ServicioDoble<ITarifaFrecuenciaService>.Crear();
        doble.Respuestas[nameof(servicio.ObtenerAsync)] = new TarifaFrecuenciaDto { Id = 7, FrecuenciaId = 11 };
        var controller = new TarifasFrecuenciaController(servicio);
        Assert.IsType<NotFoundResult>(await controller.Actualizar(11, 7, EditarDto(), default));
        Assert.IsType<NotFoundResult>(await controller.DarDeBaja(11, 7, default));
    }

    [Theory]
    [InlineData(0L)]
    [InlineData(-1L)]
    public async Task ValidaAmbosIdentificadoresAntesDeConsultar(long id)
    {
        var (servicio, doble) = ServicioDoble<ITarifaFrecuenciaService>.Crear(); var controller = new TarifasFrecuenciaController(servicio);
        Assert.IsType<BadRequestObjectResult>(await controller.Listar(id, default));
        Assert.IsType<BadRequestObjectResult>(await controller.Crear(id, CrearDto(), default));
        foreach (var (frecuencia, tarifa) in new[] { (id, 7L), (11L, id) })
        {
            Assert.IsType<BadRequestObjectResult>(await controller.Obtener(frecuencia, tarifa, default));
            Assert.IsType<BadRequestObjectResult>(await controller.Actualizar(frecuencia, tarifa, EditarDto(), default));
            Assert.IsType<BadRequestObjectResult>(await controller.DarDeBaja(frecuencia, tarifa, default));
        }
        Assert.Empty(doble.Llamadas);
    }

    [Theory]
    [InlineData(400)]
    [InlineData(404)]
    [InlineData(409)]
    public async Task TraduceErroresIncluidaFrecuenciaInexistente(int estado)
    {
        var (servicio, doble) = ServicioDoble<ITarifaFrecuenciaService>.Crear(); var controller = new TarifasFrecuenciaController(servicio);
        doble.Error = estado switch { 400 => new ValidationException("inválido"), 404 => new RecursoNoEncontradoException("frecuencia ausente"), _ => new ConflictoException("conflicto") };
        var resultados = new[] { await controller.Listar(11, default), await controller.Obtener(11, 7, default), await controller.Crear(11, CrearDto(), default),
            await controller.Actualizar(11, 7, EditarDto(), default), await controller.DarDeBaja(11, 7, default) };
        Assert.All(resultados, r => Assert.Equal(estado, Assert.IsAssignableFrom<ObjectResult>(r).StatusCode));
    }

    [Fact]
    public async Task ConflictosDeEscrituraSeTraducenDespuesDeComprobarPertenencia()
    {
        var (servicio, doble) = ServicioDoble<ITarifaFrecuenciaService>.Crear();
        doble.Respuestas[nameof(servicio.ObtenerAsync)] = new TarifaFrecuenciaDto { Id = 7, FrecuenciaId = 11 };
        doble.AlInvocar = (metodo, _) => { if (metodo != nameof(servicio.ObtenerAsync)) throw new ConflictoException("conflicto"); };
        var controller = new TarifasFrecuenciaController(servicio);
        Assert.IsType<ConflictObjectResult>(await controller.Actualizar(11, 7, EditarDto(), default));
        Assert.IsType<ConflictObjectResult>(await controller.DarDeBaja(11, 7, default));
    }

    [Fact]
    public async Task CancelacionYErrorTecnicoSePropagan()
    {
        var (servicio, doble) = ServicioDoble<ITarifaFrecuenciaService>.Crear(); var controller = new TarifasFrecuenciaController(servicio);
        using var fuente = new CancellationTokenSource(); fuente.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => controller.Obtener(11, 7, fuente.Token));
        doble.Error = new InvalidOperationException("técnico");
        Assert.Same(doble.Error, await Assert.ThrowsAsync<InvalidOperationException>(() => controller.Crear(11, CrearDto(), default)));
    }
}
