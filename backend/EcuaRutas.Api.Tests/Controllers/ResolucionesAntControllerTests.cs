using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.Controllers;
using EcuaRutas.Api.DTOs.ResolucionesAnt;
using EcuaRutas.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EcuaRutas.Api.Tests.Controllers;

public class ResolucionesAntControllerTests
{
    private static CrearResolucionAntDto CrearDto() => new() { CooperativaId = 1, NumeroResolucion = "ANT-01" };
    private static ActualizarResolucionAntDto EditarDto() => new() { CooperativaId = 1, NumeroResolucion = "ANT-01", Activa = false };

    [Fact]
    public async Task CooperativaAjenaSeTraduceA403SinMensajePrivado()
    {
        var (servicio, doble) = ServicioDoble<IResolucionAntService>.Crear();
        doble.Error = new UnauthorizedAccessException();
        var controller = new ResolucionesAntController(servicio);
        Assert.IsType<ForbidResult>(await controller.Crear(CrearDto(), default));
    }

    [Fact]
    public async Task OperacionesDevuelvenDtoUbicacionYPropaganToken()
    {
        var (servicio, doble) = ServicioDoble<IResolucionAntService>.Crear();
        var dto = new ResolucionAntDto { Id = long.MaxValue, NumeroResolucion = "ANT-01", Activa = false };
        doble.Respuestas[nameof(servicio.ListarAsync)] = new[] { dto };
        doble.Respuestas[nameof(servicio.ObtenerAsync)] = dto;
        doble.Respuestas[nameof(servicio.CrearAsync)] = dto;
        doble.Respuestas[nameof(servicio.ActualizarAsync)] = dto;
        doble.Respuestas[nameof(servicio.DarDeBajaAsync)] = true;
        var controller = new ResolucionesAntController(servicio);
        using var fuente = new CancellationTokenSource(); var ct = fuente.Token;
        Assert.Same(dto, Assert.Single(Assert.IsAssignableFrom<IReadOnlyList<ResolucionAntDto>>(Assert.IsType<OkObjectResult>(await controller.Listar(ct)).Value)));
        Assert.Same(dto, Assert.IsType<OkObjectResult>(await controller.Obtener(dto.Id, ct)).Value);
        var creado = Assert.IsType<CreatedAtActionResult>(await controller.Crear(CrearDto(), ct));
        Assert.Equal(nameof(controller.Obtener), creado.ActionName);
        Assert.Equal(dto.Id, creado.RouteValues!["id"]); Assert.Same(dto, creado.Value);
        Assert.Same(dto, Assert.IsType<OkObjectResult>(await controller.Actualizar(dto.Id, EditarDto(), ct)).Value);
        Assert.IsType<NoContentResult>(await controller.DarDeBaja(dto.Id, ct));
        doble.ComprobarTokens(ct);
    }

    [Theory]
    [InlineData(0L)]
    [InlineData(-1L)]
    public async Task IdInvalidoNoInvocaServicio(long id)
    {
        var (servicio, doble) = ServicioDoble<IResolucionAntService>.Crear(); var controller = new ResolucionesAntController(servicio);
        Assert.IsType<BadRequestObjectResult>(await controller.Obtener(id, default));
        Assert.IsType<BadRequestObjectResult>(await controller.Actualizar(id, EditarDto(), default));
        Assert.IsType<BadRequestObjectResult>(await controller.DarDeBaja(id, default));
        Assert.Empty(doble.Llamadas);
    }

    [Fact]
    public async Task AusentesDevuelven404()
    {
        var (servicio, _) = ServicioDoble<IResolucionAntService>.Crear(); var controller = new ResolucionesAntController(servicio);
        Assert.IsType<NotFoundResult>(await controller.Obtener(1, default));
        Assert.IsType<NotFoundResult>(await controller.Actualizar(1, EditarDto(), default));
        Assert.IsType<NotFoundResult>(await controller.DarDeBaja(1, default));
    }

    [Theory]
    [InlineData(400)]
    [InlineData(404)]
    [InlineData(409)]
    public async Task TraduceExcepcionesDeNegocioEnTodasLasOperaciones(int estado)
    {
        var (servicio, doble) = ServicioDoble<IResolucionAntService>.Crear(); var controller = new ResolucionesAntController(servicio);
        doble.Error = estado switch { 400 => new ValidationException("inválido"), 404 => new RecursoNoEncontradoException("ausente"), _ => new ConflictoException("conflicto") };
        var resultados = new[] { await controller.Listar(default), await controller.Obtener(1, default), await controller.Crear(CrearDto(), default),
            await controller.Actualizar(1, EditarDto(), default), await controller.DarDeBaja(1, default) };
        Assert.All(resultados, r => Assert.Equal(estado, Assert.IsAssignableFrom<ObjectResult>(r).StatusCode));
    }

    [Fact]
    public async Task CancelacionYErrorTecnicoNoSeConviertenEnErroresDeNegocio()
    {
        var (servicio, doble) = ServicioDoble<IResolucionAntService>.Crear(); var controller = new ResolucionesAntController(servicio);
        using var fuente = new CancellationTokenSource(); fuente.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => controller.Crear(CrearDto(), fuente.Token));
        doble.Error = new InvalidOperationException("detalle interno");
        Assert.Same(doble.Error, await Assert.ThrowsAsync<InvalidOperationException>(() => controller.Crear(CrearDto(), default)));
    }
}
