using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using EcuaRutas.Api.DTOs.Tarifas;
using Xunit;

namespace EcuaRutas.Api.Tests.DTOs;

public class TarifaFrecuenciaDtoTests
{
    private static readonly JsonSerializerOptions JsonWeb = new(JsonSerializerDefaults.Web);
    private const string JsonCompleto = """
        {"origenRutaParadaId":1,"destinoRutaParadaId":2,"precioBase":0,"activa":false}
        """;

    public static TheoryData<bool, bool, long> Identificadores => new()
    {
        { false, true, 0 }, { false, false, 0 }, { true, true, 0 }, { true, false, 0 },
        { false, true, -1 }, { false, false, -1 }, { true, true, -1 }, { true, false, -1 },
        { false, true, long.MinValue }, { false, false, long.MinValue },
        { true, true, long.MinValue }, { true, false, long.MinValue }
    };

    public static TheoryData<bool, decimal> PreciosValidos => CasosPrecios(0m, 1m, 12.34m, 99999999.99m, 12.340m);
    public static TheoryData<bool, decimal> PreciosInvalidos => CasosPrecios(-0.01m, 100000000m, 99999999.991m, 1.234m, 0.001m, decimal.MaxValue, decimal.MinValue);

    private static TheoryData<bool, decimal> CasosPrecios(params decimal[] precios)
    {
        var casos = new TheoryData<bool, decimal>();
        foreach (var actualizar in new[] { false, true })
        foreach (var precio in precios) casos.Add(actualizar, precio);
        return casos;
    }

    [Theory]
    [InlineData(false, 1L, 2L)]
    [InlineData(true, 1L, 2L)]
    [InlineData(false, 2147483648L, long.MaxValue)]
    [InlineData(true, 2147483648L, long.MaxValue)]
    [InlineData(false, long.MaxValue, 2147483648L)]
    [InlineData(true, long.MaxValue, 2147483648L)]
    public void AceptaExtremosDistintosPositivosYLong(bool actualizar, long origen, long destino)
    {
        Assert.Empty(Validar(Solicitud(actualizar, origen: origen, destino: destino)));
    }

    [Theory]
    [MemberData(nameof(Identificadores))]
    public void RechazaCadaExtremoCeroONegativo(bool actualizar, bool esOrigen, long id)
    {
        var dto = Solicitud(actualizar, origen: esOrigen ? id : 1, destino: esOrigen ? 2 : id);
        AssertError(dto, esOrigen ? "OrigenRutaParadaId" : "DestinoRutaParadaId");
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void RechazaExtremosIgualesEnAmbasPropiedades(bool actualizar)
    {
        var errores = Validar(Solicitud(actualizar, origen: long.MaxValue, destino: long.MaxValue));
        Assert.Contains(errores, error => error.MemberNames.Contains("OrigenRutaParadaId") && error.MemberNames.Contains("DestinoRutaParadaId"));
    }

    [Theory]
    [MemberData(nameof(PreciosValidos))]
    public void AceptaPrecioCeroPositivoMaximoYDosDecimales(bool actualizar, decimal precio)
    {
        // Los ceros decimales adicionales no alteran el valor representable en NUMERIC(10,2).
        Assert.Empty(Validar(Solicitud(actualizar, precio)));
    }

    [Theory]
    [MemberData(nameof(PreciosInvalidos))]
    public void RechazaPrecioNegativoExcesivoOConPrecisionInvalida(bool actualizar, decimal precio)
    {
        AssertError(Solicitud(actualizar, precio), "PrecioBase");
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void RechazaPrecioNuloSinConvertirloEnCero(bool actualizar)
    {
        var dto = Solicitud(actualizar, null);
        AssertError(dto, "PrecioBase");
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(dto, dto.GetType(), JsonWeb));
        Assert.Equal(JsonValueKind.Null, json.RootElement.GetProperty("precioBase").ValueKind);
    }

    [Theory]
    [InlineData(false, true)]
    [InlineData(true, true)]
    [InlineData(false, false)]
    [InlineData(true, false)]
    public void PrecioOmitidoONuloEnJsonNoSuperaValidacion(bool actualizar, bool omitir)
    {
        var json = JsonNode.Parse(JsonCompleto)!.AsObject();
        if (omitir) json.Remove("precioBase");
        else json["precioBase"] = null;
        AssertError(Deserializar(actualizar, json.ToJsonString()), "PrecioBase");
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void PrecioConTresDecimalesNoSeRedondeaDuranteValidacionNiJson(bool actualizar)
    {
        const string json = """{"origenRutaParadaId":1,"destinoRutaParadaId":2,"precioBase":12.345,"activa":false}""";
        var dto = Deserializar(actualizar, json);
        AssertError(dto, "PrecioBase");
        using var copia = JsonDocument.Parse(JsonSerializer.Serialize(dto, dto.GetType(), JsonWeb));
        Assert.Equal(12.345m, copia.RootElement.GetProperty("precioBase").GetDecimal());
    }

    [Theory]
    [InlineData(false, "es-EC")]
    [InlineData(true, "es-EC")]
    [InlineData(false, "en-US")]
    [InlineData(true, "en-US")]
    public void LimitesDecimalesSonIndependientesDeLaCultura(bool actualizar, string cultura)
    {
        var anterior = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo(cultura);
            Assert.Empty(Validar(Solicitud(actualizar, 99999999.99m)));
            AssertError(Solicitud(actualizar, 100000000m), "PrecioBase");
            AssertError(Solicitud(actualizar, 1.001m), "PrecioBase");
        }
        finally { CultureInfo.CurrentCulture = anterior; }
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ActualizacionConservaEstadoYPrecioCeroEnJson(bool activa)
    {
        var json = JsonNode.Parse(JsonCompleto)!.AsObject();
        json["activa"] = activa;
        var dto = JsonSerializer.Deserialize<ActualizarTarifaFrecuenciaDto>(json.ToJsonString(), JsonWeb)!;
        Assert.Equal(activa, dto.Activa);
        Assert.Equal(0m, dto.PrecioBase);
        Assert.Empty(Validar(dto));
        using var copia = JsonDocument.Parse(JsonSerializer.Serialize(dto, JsonWeb));
        Assert.Equal(activa, copia.RootElement.GetProperty("activa").GetBoolean());
        Assert.Equal(0m, copia.RootElement.GetProperty("precioBase").GetDecimal());
    }

    [Theory]
    [InlineData(false, "origenRutaParadaId")]
    [InlineData(true, "origenRutaParadaId")]
    [InlineData(false, "destinoRutaParadaId")]
    [InlineData(true, "destinoRutaParadaId")]
    [InlineData(true, "activa")]
    public void RechazaCamposObligatoriosOmitidosONulosEnJson(bool actualizar, string propiedad)
    {
        var json = JsonNode.Parse(JsonCompleto)!.AsObject();
        json.Remove(propiedad);
        Assert.Throws<JsonException>(() => Deserializar(actualizar, json.ToJsonString()));
        json[propiedad] = null;
        Assert.Throws<JsonException>(() => Deserializar(actualizar, json.ToJsonString()));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void RoundTripConservaIdentificadoresLongYPrecioDecimalExacto(bool actualizar)
    {
        var dto = Solicitud(actualizar, 99999999.99m, long.MaxValue, long.MaxValue - 1);
        var json = JsonSerializer.Serialize(dto, dto.GetType(), JsonWeb);
        using var documento = JsonDocument.Parse(json);
        Assert.Equal(long.MaxValue, documento.RootElement.GetProperty("origenRutaParadaId").GetInt64());
        Assert.Equal(long.MaxValue - 1, documento.RootElement.GetProperty("destinoRutaParadaId").GetInt64());
        Assert.Equal(99999999.99m, documento.RootElement.GetProperty("precioBase").GetDecimal());
        var copia = Deserializar(actualizar, json);
        Assert.Empty(Validar(copia));
        Assert.Equal(json, JsonSerializer.Serialize(copia, copia.GetType(), JsonWeb));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void EntradaSoloExponeCamposDelCuerpoSinFrecuenciaNiLugar(bool actualizar)
    {
        var dto = Solicitud(actualizar);
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(dto, dto.GetType(), JsonWeb));
        var nombres = json.RootElement.EnumerateObject().Select(propiedad => propiedad.Name).OrderBy(nombre => nombre).ToArray();
        var esperados = actualizar
            ? new[] { "activa", "destinoRutaParadaId", "origenRutaParadaId", "precioBase" }
            : new[] { "destinoRutaParadaId", "origenRutaParadaId", "precioBase" };
        Assert.Equal(esperados, nombres);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void RespuestaConservaSusSeisCamposSinNavegaciones(bool activa)
    {
        var dto = new TarifaFrecuenciaDto
        {
            Id = long.MaxValue, FrecuenciaId = long.MaxValue - 1, OrigenRutaParadaId = long.MaxValue - 2,
            DestinoRutaParadaId = long.MaxValue - 3, PrecioBase = 99999999.99m, Activa = activa
        };
        var json = JsonSerializer.Serialize(dto, JsonWeb);
        using var documento = JsonDocument.Parse(json);
        Assert.Equal(6, documento.RootElement.EnumerateObject().Count());
        var copia = JsonSerializer.Deserialize<TarifaFrecuenciaDto>(json, JsonWeb)!;
        Assert.Equal(dto.Id, copia.Id);
        Assert.Equal(dto.FrecuenciaId, copia.FrecuenciaId);
        Assert.Equal(dto.OrigenRutaParadaId, copia.OrigenRutaParadaId);
        Assert.Equal(dto.DestinoRutaParadaId, copia.DestinoRutaParadaId);
        Assert.Equal(dto.PrecioBase, copia.PrecioBase);
        Assert.Equal(dto.Activa, copia.Activa);
    }

    private static object Deserializar(bool actualizar, string json) => actualizar
        ? JsonSerializer.Deserialize<ActualizarTarifaFrecuenciaDto>(json, JsonWeb)!
        : JsonSerializer.Deserialize<CrearTarifaFrecuenciaDto>(json, JsonWeb)!;

    private static object Solicitud(bool actualizar, decimal? precio = 0m, long origen = 1, long destino = 2) => actualizar
        ? new ActualizarTarifaFrecuenciaDto
        {
            OrigenRutaParadaId = origen, DestinoRutaParadaId = destino, PrecioBase = precio, Activa = false
        }
        : new CrearTarifaFrecuenciaDto
        {
            OrigenRutaParadaId = origen, DestinoRutaParadaId = destino, PrecioBase = precio
        };

    private static List<ValidationResult> Validar(object dto)
    {
        var errores = new List<ValidationResult>();
        Validator.TryValidateObject(dto, new ValidationContext(dto), errores, validateAllProperties: true);
        return errores;
    }

    private static void AssertError(object dto, string propiedad)
    {
        Assert.Contains(Validar(dto), error => error.MemberNames.Contains(propiedad));
    }
}
