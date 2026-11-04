using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using EcuaRutas.Api.DTOs.Frecuencias;
using Xunit;

namespace EcuaRutas.Api.Tests.DTOs;

public class FrecuenciaDtoTests
{
    private static readonly JsonSerializerOptions JsonWeb = new(JsonSerializerDefaults.Web);
    private const string JsonCompleto = """
        {"cooperativaId":1,"rutaId":2,"resolucionAntId":3,"codigo":null,"horaSalida":"00:00:00","activa":false}
        """;

    public static TheoryData<bool, string, long> IdentificadoresValidos => CasosIdentificadores(1, (long)int.MaxValue + 1, long.MaxValue);
    public static TheoryData<bool, string, long> IdentificadoresInvalidos => CasosIdentificadores(0, -1, long.MinValue);

    private static TheoryData<bool, string, long> CasosIdentificadores(params long[] valores)
    {
        var casos = new TheoryData<bool, string, long>();
        foreach (var actualizar in new[] { false, true })
        foreach (var propiedad in new[] { "CooperativaId", "RutaId", "ResolucionAntId" })
        foreach (var valor in valores) casos.Add(actualizar, propiedad, valor);
        return casos;
    }

    [Theory]
    [MemberData(nameof(IdentificadoresValidos))]
    public void AceptaCadaIdentificadorPositivoIncluidosLong(bool actualizar, string propiedad, long valor)
    {
        Assert.Empty(Validar(ConIdentificador(actualizar, propiedad, valor)));
    }

    [Theory]
    [MemberData(nameof(IdentificadoresInvalidos))]
    public void RechazaCadaIdentificadorCeroONegativo(bool actualizar, string propiedad, long valor)
    {
        AssertError(ConIdentificador(actualizar, propiedad, valor), propiedad);
    }

    [Theory]
    [InlineData(false, null)]
    [InlineData(true, null)]
    [InlineData(false, "")]
    [InlineData(true, "")]
    [InlineData(false, "   ")]
    [InlineData(true, "   ")]
    public void AceptaCodigoOpcionalSinInventarFormato(bool actualizar, string? codigo)
    {
        Assert.Empty(Validar(Solicitud(actualizar, TimeOnly.MinValue, codigo: codigo)));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void AceptaCincuentaCaracteresYRechazaCincuentaYUno(bool actualizar)
    {
        Assert.Empty(Validar(Solicitud(actualizar, TimeOnly.MinValue, codigo: new string('F', 50))));
        AssertError(Solicitud(actualizar, TimeOnly.MinValue, codigo: new string('F', 51)), "Codigo");
    }

    [Theory]
    [InlineData(false, 0, 0, 0)]
    [InlineData(true, 0, 0, 0)]
    [InlineData(false, 8, 30, 15)]
    [InlineData(true, 8, 30, 15)]
    [InlineData(false, 23, 59, 59)]
    [InlineData(true, 23, 59, 59)]
    public void AceptaHorasValidasIncluidaMedianoche(bool actualizar, int hora, int minuto, int segundo)
    {
        Assert.Empty(Validar(Solicitud(actualizar, new TimeOnly(hora, minuto, segundo))));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void RechazaHoraNulaMedianteDataAnnotations(bool actualizar)
    {
        AssertError(Solicitud(actualizar), "HoraSalida");
    }

    [Theory]
    [InlineData(false, true)]
    [InlineData(true, true)]
    [InlineData(false, false)]
    [InlineData(true, false)]
    public void RechazaHoraOmitidaONulaEnJson(bool actualizar, bool omitir)
    {
        var json = JsonNode.Parse(JsonCompleto)!.AsObject();
        if (omitir) json.Remove("horaSalida");
        else json["horaSalida"] = null;
        AssertError(Deserializar(actualizar, json.ToJsonString()), "HoraSalida");
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void RoundTripConservaLongCodigoYHoraSinFecha(bool actualizar)
    {
        const string codigo = "  Frecuencia Á-01  ";
        var hora = new TimeOnly(13, 45, 27).Add(TimeSpan.FromTicks(1234560));
        object dto = actualizar
            ? new ActualizarFrecuenciaDto
            {
                CooperativaId = long.MaxValue, RutaId = long.MaxValue - 1, ResolucionAntId = long.MaxValue - 2,
                Codigo = codigo, HoraSalida = hora, Activa = false
            }
            : new CrearFrecuenciaDto
            {
                CooperativaId = long.MaxValue, RutaId = long.MaxValue - 1, ResolucionAntId = long.MaxValue - 2,
                Codigo = codigo, HoraSalida = hora
            };
        var json = JsonSerializer.Serialize(dto, dto.GetType(), JsonWeb);
        using var documento = JsonDocument.Parse(json);
        Assert.Equal(long.MaxValue, documento.RootElement.GetProperty("cooperativaId").GetInt64());
        Assert.Equal(long.MaxValue - 1, documento.RootElement.GetProperty("rutaId").GetInt64());
        Assert.Equal(long.MaxValue - 2, documento.RootElement.GetProperty("resolucionAntId").GetInt64());
        Assert.Equal(codigo, documento.RootElement.GetProperty("codigo").GetString());
        var horaJson = documento.RootElement.GetProperty("horaSalida").GetString()!;
        Assert.Equal(hora, TimeOnly.Parse(horaJson, CultureInfo.InvariantCulture));
        Assert.DoesNotContain("T", horaJson);
        var copia = Deserializar(actualizar, json);
        Assert.Empty(Validar(copia));
        Assert.Equal(json, JsonSerializer.Serialize(copia, copia.GetType(), JsonWeb));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ActualizacionPreservaEstadoCodigoNuloYMedianoche(bool activa)
    {
        var json = JsonNode.Parse(JsonCompleto)!.AsObject();
        json["activa"] = activa;
        var dto = JsonSerializer.Deserialize<ActualizarFrecuenciaDto>(json.ToJsonString(), JsonWeb)!;
        Assert.Equal(activa, dto.Activa);
        Assert.Equal(TimeOnly.MinValue, dto.HoraSalida);
        Assert.Null(dto.Codigo);
        Assert.Empty(Validar(dto));
        using var copia = JsonDocument.Parse(JsonSerializer.Serialize(dto, JsonWeb));
        Assert.Equal(activa, copia.RootElement.GetProperty("activa").GetBoolean());
        Assert.Equal("00:00:00", copia.RootElement.GetProperty("horaSalida").GetString());
        Assert.Equal(JsonValueKind.Null, copia.RootElement.GetProperty("codigo").ValueKind);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void CodigoOmitidoQuedaNulo(bool actualizar)
    {
        var json = JsonNode.Parse(JsonCompleto)!.AsObject();
        json.Remove("codigo");
        var dto = Deserializar(actualizar, json.ToJsonString());
        Assert.Empty(Validar(dto));
        using var copia = JsonDocument.Parse(JsonSerializer.Serialize(dto, dto.GetType(), JsonWeb));
        Assert.Equal(JsonValueKind.Null, copia.RootElement.GetProperty("codigo").ValueKind);
    }

    [Theory]
    [InlineData(false, "cooperativaId")]
    [InlineData(true, "cooperativaId")]
    [InlineData(false, "rutaId")]
    [InlineData(true, "rutaId")]
    [InlineData(false, "resolucionAntId")]
    [InlineData(true, "resolucionAntId")]
    [InlineData(true, "activa")]
    public void JsonRechazaCamposObligatoriosOmitidosONulos(bool actualizar, string propiedad)
    {
        var json = JsonNode.Parse(JsonCompleto)!.AsObject();
        json.Remove(propiedad);
        Assert.Throws<JsonException>(() => Deserializar(actualizar, json.ToJsonString()));
        json[propiedad] = null;
        Assert.Throws<JsonException>(() => Deserializar(actualizar, json.ToJsonString()));
    }

    [Theory]
    [InlineData(false, "24:00:00")]
    [InlineData(true, "24:00:00")]
    [InlineData(false, "2026-11-03T08:30:00")]
    [InlineData(true, "2026-11-03T08:30:00")]
    [InlineData(false, "no-es-hora")]
    [InlineData(true, "no-es-hora")]
    public void JsonRechazaHorasFueraDeTimeOnlyOConFecha(bool actualizar, string hora)
    {
        var json = JsonNode.Parse(JsonCompleto)!.AsObject();
        json["horaSalida"] = hora;
        Assert.Throws<JsonException>(() => Deserializar(actualizar, json.ToJsonString()));
    }

    [Fact]
    public void CreacionNoExponeIdNiEstadoYSoloContieneLosCamposDelAlta()
    {
        var dto = new CrearFrecuenciaDto { CooperativaId = 1, RutaId = 2, ResolucionAntId = 3, HoraSalida = TimeOnly.MinValue };
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(dto, JsonWeb));
        Assert.Equal(5, json.RootElement.EnumerateObject().Count());
        Assert.False(json.RootElement.TryGetProperty("id", out _));
        Assert.False(json.RootElement.TryGetProperty("activa", out _));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void RespuestaConservaSusSieteCamposSinNavegaciones(bool activa)
    {
        var dto = new FrecuenciaDto
        {
            Id = long.MaxValue, CooperativaId = long.MaxValue - 1, RutaId = long.MaxValue - 2,
            ResolucionAntId = long.MaxValue - 3, Codigo = null, HoraSalida = TimeOnly.MinValue, Activa = activa
        };
        var json = JsonSerializer.Serialize(dto, JsonWeb);
        using var documento = JsonDocument.Parse(json);
        Assert.Equal(7, documento.RootElement.EnumerateObject().Count());
        var copia = JsonSerializer.Deserialize<FrecuenciaDto>(json, JsonWeb)!;
        Assert.Equal(dto.Id, copia.Id);
        Assert.Equal(dto.CooperativaId, copia.CooperativaId);
        Assert.Equal(dto.RutaId, copia.RutaId);
        Assert.Equal(dto.ResolucionAntId, copia.ResolucionAntId);
        Assert.Equal(dto.HoraSalida, copia.HoraSalida);
        Assert.Equal(dto.Activa, copia.Activa);
        Assert.Null(copia.Codigo);
    }

    private static object Deserializar(bool actualizar, string json) => actualizar
        ? JsonSerializer.Deserialize<ActualizarFrecuenciaDto>(json, JsonWeb)!
        : JsonSerializer.Deserialize<CrearFrecuenciaDto>(json, JsonWeb)!;

    private static object ConIdentificador(bool actualizar, string propiedad, long valor) => Solicitud(actualizar, TimeOnly.MinValue,
        cooperativa: propiedad == "CooperativaId" ? valor : 1,
        ruta: propiedad == "RutaId" ? valor : 2,
        resolucion: propiedad == "ResolucionAntId" ? valor : 3);

    private static object Solicitud(bool actualizar, TimeOnly? hora = null, string? codigo = null,
        long cooperativa = 1, long ruta = 2, long resolucion = 3) => actualizar
        ? new ActualizarFrecuenciaDto
        {
            CooperativaId = cooperativa, RutaId = ruta, ResolucionAntId = resolucion,
            Codigo = codigo, HoraSalida = hora, Activa = false
        }
        : new CrearFrecuenciaDto
        {
            CooperativaId = cooperativa, RutaId = ruta, ResolucionAntId = resolucion,
            Codigo = codigo, HoraSalida = hora
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
