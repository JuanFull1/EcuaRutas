using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.Controllers;
using EcuaRutas.Api.DTOs.Frecuencias;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace EcuaRutas.Api.Tests.Controllers;

public class FrecuenciasControllerTests
{
    private static CrearFrecuenciaDto CrearDto() => new() { CooperativaId = 1, RutaId = 2, ResolucionAntId = 3, HoraSalida = TimeOnly.MinValue };
    private static ActualizarFrecuenciaDto EditarDto() => new() { CooperativaId = 1, RutaId = 2, ResolucionAntId = 3, HoraSalida = TimeOnly.MinValue, Activa = false };

    [Fact]
    public async Task OperacionesPreservanMedianocheFiltrosFalseYToken()
    {
        var (servicio, doble) = ServicioDoble<IFrecuenciaService>.Crear();
        var dto = new FrecuenciaDto { Id = 5, HoraSalida = TimeOnly.MinValue, Activa = false };
        doble.Respuestas[nameof(servicio.ListarAsync)] = new[] { dto }; doble.Respuestas[nameof(servicio.ObtenerAsync)] = dto;
        doble.Respuestas[nameof(servicio.CrearAsync)] = dto; doble.Respuestas[nameof(servicio.ActualizarAsync)] = dto;
        doble.Respuestas[nameof(servicio.DarDeBajaAsync)] = true;
        var controller = new FrecuenciasController(servicio); using var fuente = new CancellationTokenSource(); var ct = fuente.Token;
        Assert.IsType<OkObjectResult>(await controller.Listar(1, 2, ct));
        Assert.Equal(1L, doble.Llamadas[0].Argumentos[0]); Assert.Equal(2L, doble.Llamadas[0].Argumentos[1]);
        Assert.Same(dto, Assert.IsType<OkObjectResult>(await controller.Obtener(5, ct)).Value);
        var crear = CrearDto(); var editar = EditarDto();
        var creado = Assert.IsType<CreatedAtActionResult>(await controller.Crear(crear, ct));
        Assert.Equal(nameof(controller.Obtener), creado.ActionName); Assert.Equal(5L, creado.RouteValues!["id"]);
        Assert.Same(dto, creado.Value);
        Assert.Same(dto, Assert.IsType<OkObjectResult>(await controller.Actualizar(5, editar, ct)).Value);
        Assert.Equal(TimeOnly.MinValue, dto.HoraSalida); Assert.False(dto.Activa);
        Assert.Same(crear, doble.Llamadas.Single(l => l.Metodo == nameof(servicio.CrearAsync)).Argumentos[0]);
        Assert.Same(editar, doble.Llamadas.Single(l => l.Metodo == nameof(servicio.ActualizarAsync)).Argumentos[1]);
        Assert.IsType<NoContentResult>(await controller.DarDeBaja(5, ct)); doble.ComprobarTokens(ct);
    }

    [Theory]
    [InlineData(0L)]
    [InlineData(-1L)]
    public async Task IdYFiltrosInvalidosNoInvocanServicio(long id)
    {
        var (servicio, doble) = ServicioDoble<IFrecuenciaService>.Crear(); var controller = new FrecuenciasController(servicio);
        Assert.IsType<BadRequestObjectResult>(await controller.Obtener(id, default));
        Assert.IsType<BadRequestObjectResult>(await controller.Actualizar(id, EditarDto(), default));
        Assert.IsType<BadRequestObjectResult>(await controller.DarDeBaja(id, default));
        Assert.IsType<BadRequestObjectResult>(await controller.Listar(id, null, default));
        Assert.IsType<BadRequestObjectResult>(await controller.Listar(null, id, default)); Assert.Empty(doble.Llamadas);
    }

    [Fact]
    public async Task AusentesDevuelven404()
    {
        var (servicio, _) = ServicioDoble<IFrecuenciaService>.Crear(); var controller = new FrecuenciasController(servicio);
        Assert.IsType<NotFoundResult>(await controller.Obtener(1, default));
        Assert.IsType<NotFoundResult>(await controller.Actualizar(1, EditarDto(), default));
        Assert.IsType<NotFoundResult>(await controller.DarDeBaja(1, default));
    }

    [Theory]
    [InlineData(400)]
    [InlineData(404)]
    [InlineData(409)]
    public async Task TraduceErroresDeNegocio(int estado)
    {
        var (servicio, doble) = ServicioDoble<IFrecuenciaService>.Crear(); var controller = new FrecuenciasController(servicio);
        doble.Error = estado switch { 400 => new ValidationException("inválido"), 404 => new RecursoNoEncontradoException("ausente"), _ => new ConflictoException("conflicto") };
        var resultados = new[] { await controller.Listar(null, null, default), await controller.Obtener(1, default), await controller.Crear(CrearDto(), default),
            await controller.Actualizar(1, EditarDto(), default), await controller.DarDeBaja(1, default) };
        Assert.All(resultados, r => Assert.Equal(estado, Assert.IsAssignableFrom<ObjectResult>(r).StatusCode));
    }

    [Fact]
    public async Task CancelacionYErrorTecnicoSePropagan()
    {
        var (servicio, doble) = ServicioDoble<IFrecuenciaService>.Crear(); var controller = new FrecuenciasController(servicio);
        using var fuente = new CancellationTokenSource(); fuente.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => controller.Crear(CrearDto(), fuente.Token));
        doble.Error = new InvalidOperationException("técnico");
        Assert.Same(doble.Error, await Assert.ThrowsAsync<InvalidOperationException>(() => controller.Obtener(1, default)));
    }
}
