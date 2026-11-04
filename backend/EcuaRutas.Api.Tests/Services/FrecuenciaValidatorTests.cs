using System.Text.Json;
using EcuaRutas.Api.Models;
using EcuaRutas.Api.Services;
using Xunit;

namespace EcuaRutas.Api.Tests.Services;

public class FrecuenciaValidatorTests
{
    [Fact]
    public void AceptaReferenciasCoincidentesSinNavegacionesNiIdPersistido()
    {
        var datos = Datos();
        datos.Frecuencia.Id = 0;
        Assert.Empty(FrecuenciaValidator.Validar(datos.Frecuencia, datos.Cooperativa, datos.Ruta, datos.Resolucion));
    }

    [Theory]
    [InlineData("cooperativa")]
    [InlineData("ruta")]
    [InlineData("resolucion")]
    [InlineData("cooperativaResolucion")]
    public void RechazaReferenciasInconsistentes(string referencia)
    {
        var datos = Datos();
        switch (referencia)
        {
            case "cooperativa": datos.Cooperativa.Id++; break;
            case "ruta": datos.Ruta.Id++; break;
            case "resolucion": datos.Resolucion.Id++; break;
            case "cooperativaResolucion": datos.Resolucion.CooperativaId++; break;
        }
        Assert.NotEmpty(FrecuenciaValidator.Validar(datos.Frecuencia, datos.Cooperativa, datos.Ruta, datos.Resolucion));
    }

    [Theory]
    [InlineData("frecuencia")]
    [InlineData("cooperativa")]
    [InlineData("ruta")]
    [InlineData("resolucion")]
    public void RechazaReferenciaNulaSinLanzarExcepcion(string referencia)
    {
        var datos = Datos();
        Assert.NotEmpty(FrecuenciaValidator.Validar(
            referencia == "frecuencia" ? null : datos.Frecuencia,
            referencia == "cooperativa" ? null : datos.Cooperativa,
            referencia == "ruta" ? null : datos.Ruta,
            referencia == "resolucion" ? null : datos.Resolucion));
    }

    [Theory]
    [InlineData(0L)]
    [InlineData(-1L)]
    public void RechazaIdentificadoresIncompletosAunqueCoincidan(long id)
    {
        var datos = Datos();
        datos.Frecuencia.CooperativaId = datos.Cooperativa.Id = datos.Resolucion.CooperativaId = id;
        datos.Frecuencia.RutaId = datos.Ruta.Id = id;
        datos.Frecuencia.ResolucionAntId = datos.Resolucion.Id = id;
        var errores = FrecuenciaValidator.Validar(datos.Frecuencia, datos.Cooperativa, datos.Ruta, datos.Resolucion);
        Assert.Contains(errores, error => error.Contains("cooperativa", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(errores, error => error.Contains("ruta", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(errores, error => error.Contains("resolución", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void AceptaIdentificadoresLongSinRelacionInventadaEntreRutaYCooperativa()
    {
        var datos = Datos();
        datos.Frecuencia.CooperativaId = datos.Cooperativa.Id = datos.Resolucion.CooperativaId = long.MaxValue;
        datos.Frecuencia.RutaId = datos.Ruta.Id = long.MaxValue - 1;
        datos.Frecuencia.ResolucionAntId = datos.Resolucion.Id = long.MaxValue - 2;
        Assert.Empty(FrecuenciaValidator.Validar(datos.Frecuencia, datos.Cooperativa, datos.Ruta, datos.Resolucion));
    }

    [Theory]
    [InlineData("cooperativa")]
    [InlineData("ruta")]
    [InlineData("resolucion")]
    public void ActividadEsOpcionalYSeCompruebaSoloEnLaVarianteExplicita(string referencia)
    {
        var datos = Datos();
        switch (referencia)
        {
            case "cooperativa": datos.Cooperativa.Activa = false; break;
            case "ruta": datos.Ruta.Activa = false; break;
            case "resolucion": datos.Resolucion.Activa = false; break;
        }
        Assert.Empty(FrecuenciaValidator.Validar(datos.Frecuencia, datos.Cooperativa, datos.Ruta, datos.Resolucion));
        Assert.Contains(FrecuenciaValidator.ValidarConReferenciasActivas(datos.Frecuencia, datos.Cooperativa, datos.Ruta, datos.Resolucion),
            error => error.Contains("inactiva", StringComparison.Ordinal));
    }

    [Fact]
    public void VarianteActivaAceptaReferenciasActivasYConservaLaValidacionDeCoherencia()
    {
        var datos = Datos();
        Assert.Empty(FrecuenciaValidator.ValidarConReferenciasActivas(datos.Frecuencia, datos.Cooperativa, datos.Ruta, datos.Resolucion));
        datos.Resolucion.CooperativaId++;
        Assert.NotEmpty(FrecuenciaValidator.ValidarConReferenciasActivas(datos.Frecuencia, datos.Cooperativa, datos.Ruta, datos.Resolucion));
        Assert.NotEmpty(FrecuenciaValidator.ValidarConReferenciasActivas(null, null, null, null));
    }

    [Theory]
    [InlineData("cooperativa")]
    [InlineData("ruta")]
    [InlineData("resolucion")]
    [InlineData("hora")]
    public void DetectaCadaCambioEstructuralSinConsultarReferenciasOperativas(string campo)
    {
        var actual = Datos().Frecuencia;
        var propuesta = Datos().Frecuencia;
        switch (campo)
        {
            case "cooperativa": propuesta.CooperativaId++; break;
            case "ruta": propuesta.RutaId++; break;
            case "resolucion": propuesta.ResolucionAntId++; break;
            case "hora": propuesta.HoraSalida = new TimeOnly(1, 0); break;
        }
        Assert.True(FrecuenciaValidator.TieneCambiosEstructurales(actual, propuesta));
    }

    [Fact]
    public void NoConfundeMetadatosEstadoOMedianocheConCambiosEstructurales()
    {
        var actual = Datos().Frecuencia;
        var propuesta = Datos().Frecuencia;
        Assert.False(FrecuenciaValidator.TieneCambiosEstructurales(actual, propuesta));
        propuesta.Codigo = null;
        propuesta.Activa = false;
        Assert.False(FrecuenciaValidator.TieneCambiosEstructurales(actual, propuesta));
    }

    [Fact]
    public void ComparacionEstructuralExigeAmbasVersiones()
    {
        var frecuencia = Datos().Frecuencia;
        Assert.Throws<ArgumentNullException>(() => FrecuenciaValidator.TieneCambiosEstructurales(null!, frecuencia));
        Assert.Throws<ArgumentNullException>(() => FrecuenciaValidator.TieneCambiosEstructurales(frecuencia, null!));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void NoModificaEntidadesEnValidacionesExitosasNiFallidas(bool inconsistente)
    {
        var datos = Datos();
        var propuesta = Datos().Frecuencia;
        if (inconsistente) { datos.Ruta.Id++; datos.Resolucion.Activa = false; propuesta.RutaId++; }
        var antes = JsonSerializer.Serialize(new { datos.Frecuencia, datos.Cooperativa, datos.Ruta, datos.Resolucion, propuesta });
        FrecuenciaValidator.Validar(datos.Frecuencia, datos.Cooperativa, datos.Ruta, datos.Resolucion);
        FrecuenciaValidator.ValidarConReferenciasActivas(datos.Frecuencia, datos.Cooperativa, datos.Ruta, datos.Resolucion);
        FrecuenciaValidator.TieneCambiosEstructurales(datos.Frecuencia, propuesta);
        Assert.Equal(antes, JsonSerializer.Serialize(new { datos.Frecuencia, datos.Cooperativa, datos.Ruta, datos.Resolucion, propuesta }));
    }

    private static (Frecuencia Frecuencia, Cooperativa Cooperativa, Ruta Ruta, ResolucionesAnt Resolucion) Datos() =>
        (new Frecuencia { Id = 7, CooperativaId = 11, RutaId = 22, ResolucionAntId = 33, Codigo = "F-01", HoraSalida = TimeOnly.MinValue, Activa = true },
         new Cooperativa { Id = 11, Activa = true },
         new Ruta { Id = 22, Activa = true },
         new ResolucionesAnt { Id = 33, CooperativaId = 11, Activa = true });
}
