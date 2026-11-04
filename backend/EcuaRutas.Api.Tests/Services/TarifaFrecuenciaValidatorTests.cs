using System.Text.Json;
using EcuaRutas.Api.DTOs.Tarifas;
using EcuaRutas.Api.Models;
using EcuaRutas.Api.Services;
using Xunit;

namespace EcuaRutas.Api.Tests.Services;

public class TarifaFrecuenciaValidatorTests
{
    [Fact]
    public void AceptaMismaRutaYOrdenCeroSinOrdenarPorIdentificadorNiLugar()
    {
        var datos = Datos();
        // Origen con ID mayor y LugarId diferente de su ID de parada: se usa Orden.
        Assert.True(datos.Origen.Id > datos.Destino.Id);
        Assert.NotEqual(datos.Origen.Id, datos.Origen.LugarId);
        datos.Tarifa.Id = 0;
        Assert.Empty(TarifaFrecuenciaValidator.Validar(datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void RechazaCadaParadaDeOtraRuta(bool esOrigen)
    {
        var datos = Datos();
        if (esOrigen) datos.Origen.RutaId++;
        else datos.Destino.RutaId++;
        Assert.Contains(TarifaFrecuenciaValidator.Validar(datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino),
            error => error.Contains(esOrigen ? "origen no pertenece" : "destino no pertenece", StringComparison.Ordinal));
    }

    [Fact]
    public void RechazaDosParadasDeLaMismaRutaSiEsAjenaALaFrecuencia()
    {
        var datos = Datos();
        datos.Origen.RutaId = datos.Destino.RutaId = 99;
        Assert.NotEmpty(TarifaFrecuenciaValidator.Validar(datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino));
    }

    [Fact]
    public void RechazaExtremosIdenticosInclusoConObjetosDistintosYOrdenDistinto()
    {
        var datos = Datos();
        datos.Destino.Id = datos.Tarifa.DestinoRutaParadaId = datos.Origen.Id;
        Assert.Contains(TarifaFrecuenciaValidator.Validar(datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino),
            error => error.Contains("paradas distintas", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData(10, 0)]
    [InlineData(5, 5)]
    [InlineData(-1, 5)]
    [InlineData(0, -1)]
    public void RechazaOrdenInvertidoIgualONegativo(int ordenOrigen, int ordenDestino)
    {
        var datos = Datos();
        datos.Origen.Orden = ordenOrigen;
        datos.Destino.Orden = ordenDestino;
        Assert.NotEmpty(TarifaFrecuenciaValidator.Validar(datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino));
    }

    [Theory]
    [InlineData("frecuencia")]
    [InlineData("origen")]
    [InlineData("destino")]
    public void RechazaReferenciaConIdentidadDistintaDeLaTarifa(string referencia)
    {
        var datos = Datos();
        switch (referencia)
        {
            case "frecuencia": datos.Frecuencia.Id++; break;
            case "origen": datos.Origen.Id++; break;
            case "destino": datos.Destino.Id++; break;
        }
        Assert.NotEmpty(TarifaFrecuenciaValidator.Validar(datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino));
    }

    [Theory]
    [InlineData("tarifa")]
    [InlineData("frecuencia")]
    [InlineData("origen")]
    [InlineData("destino")]
    public void RechazaNulosSinAccederANavegaciones(string referencia)
    {
        var datos = Datos();
        Assert.NotEmpty(TarifaFrecuenciaValidator.Validar(
            referencia == "tarifa" ? null : datos.Tarifa,
            referencia == "frecuencia" ? null : datos.Frecuencia,
            referencia == "origen" ? null : datos.Origen,
            referencia == "destino" ? null : datos.Destino));
    }

    [Theory]
    [InlineData(0L)]
    [InlineData(-1L)]
    public void RechazaIdentificadoresIncompletosAunqueCoincidan(long id)
    {
        var datos = Datos();
        datos.Tarifa.FrecuenciaId = datos.Frecuencia.Id = id;
        datos.Frecuencia.RutaId = datos.Origen.RutaId = datos.Destino.RutaId = id;
        datos.Origen.Id = datos.Tarifa.OrigenRutaParadaId = id;
        datos.Destino.Id = datos.Tarifa.DestinoRutaParadaId = id;
        Assert.NotEmpty(TarifaFrecuenciaValidator.Validar(datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino));
    }

    [Fact]
    public void AceptaIdentificadoresLong()
    {
        var datos = Datos();
        datos.Frecuencia.Id = datos.Tarifa.FrecuenciaId = long.MaxValue;
        datos.Origen.Id = datos.Tarifa.OrigenRutaParadaId = long.MaxValue - 1;
        datos.Destino.Id = datos.Tarifa.DestinoRutaParadaId = long.MaxValue - 2;
        datos.Frecuencia.RutaId = datos.Origen.RutaId = datos.Destino.RutaId = long.MaxValue - 3;
        Assert.Empty(TarifaFrecuenciaValidator.Validar(datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino));
    }

    [Fact]
    public void ActividadEsExplicitaYNoImponeReglasSobreLaTarifaOPermisosDeParadas()
    {
        var datos = Datos();
        datos.Tarifa.Activa = false;
        datos.Origen.PermiteAscenso = false;
        datos.Destino.PermiteDescenso = false;
        Assert.Empty(TarifaFrecuenciaValidator.ValidarConFrecuenciaActiva(datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino));
        datos.Frecuencia.Activa = false;
        Assert.Empty(TarifaFrecuenciaValidator.Validar(datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino));
        Assert.Contains(TarifaFrecuenciaValidator.ValidarConFrecuenciaActiva(datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino),
            error => error.Contains("inactiva", StringComparison.Ordinal));
    }

    [Fact]
    public void VarianteActivaConservaLaValidacionDeCoherenciaYDeNulos()
    {
        var datos = Datos();
        datos.Origen.RutaId++;
        Assert.NotEmpty(TarifaFrecuenciaValidator.ValidarConFrecuenciaActiva(datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino));
        Assert.NotEmpty(TarifaFrecuenciaValidator.ValidarConFrecuenciaActiva(null, null, null, null));
    }

    [Theory]
    [InlineData("0", true)]
    [InlineData("12.34", true)]
    [InlineData("99999999.99", true)]
    [InlineData("-0.01", false)]
    [InlineData("100000000", false)]
    [InlineData("12.345", false)]
    public void ReutilizaValidacionDelPrecioDelDtoSinRedondear(string texto, bool valido)
    {
        var datos = Datos();
        datos.Tarifa.PrecioBase = decimal.Parse(texto, System.Globalization.CultureInfo.InvariantCulture);
        var contrato = new CrearTarifaFrecuenciaDto
        {
            OrigenRutaParadaId = datos.Tarifa.OrigenRutaParadaId,
            DestinoRutaParadaId = datos.Tarifa.DestinoRutaParadaId,
            PrecioBase = datos.Tarifa.PrecioBase
        };
        var erroresDto = new List<System.ComponentModel.DataAnnotations.ValidationResult>();
        Assert.Equal(valido, System.ComponentModel.DataAnnotations.Validator.TryValidateObject(
            contrato, new System.ComponentModel.DataAnnotations.ValidationContext(contrato), erroresDto, validateAllProperties: true));
        var errores = TarifaFrecuenciaValidator.Validar(datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino);
        Assert.Equal(valido, errores.Count == 0);
        foreach (var error in erroresDto) Assert.Contains(error.ErrorMessage!, errores);
        Assert.Equal(contrato.PrecioBase, datos.Tarifa.PrecioBase);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void PreservaTodosLosObjetosEnExitoYError(bool inconsistente)
    {
        var datos = Datos();
        if (inconsistente) { datos.Tarifa.PrecioBase = 12.345m; datos.Frecuencia.Activa = false; datos.Origen.RutaId++; }
        var antes = JsonSerializer.Serialize(new { datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino });
        TarifaFrecuenciaValidator.Validar(datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino);
        TarifaFrecuenciaValidator.ValidarConFrecuenciaActiva(datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino);
        Assert.Equal(antes, JsonSerializer.Serialize(new { datos.Tarifa, datos.Frecuencia, datos.Origen, datos.Destino }));
    }

    private static (TarifasFrecuencium Tarifa, Frecuencia Frecuencia, RutaParada Origen, RutaParada Destino) Datos() =>
        (new TarifasFrecuencium { Id = 1, FrecuenciaId = 7, OrigenRutaParadaId = 300, DestinoRutaParadaId = 100, PrecioBase = 12.34m, Activa = true },
         new Frecuencia { Id = 7, RutaId = 22, Activa = true },
         new RutaParada { Id = 300, LugarId = 11, RutaId = 22, Orden = 0 },
         new RutaParada { Id = 100, LugarId = 33, RutaId = 22, Orden = 10 });
}
