using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using EcuaRutas.Api.DTOs.ResolucionesAnt;
using Xunit;

namespace EcuaRutas.Api.Tests.DTOs;

public class ResolucionesAntDtoTests
{
    private static readonly JsonSerializerOptions JsonWeb = new(JsonSerializerDefaults.Web);

    // Cada caso se aplica a creación y actualización para comprobar ambos contratos.
    public static TheoryData<bool, long> CooperativasValidas => new()
    {
        { false, 1 }, { true, 1 },
        { false, (long)int.MaxValue + 1 }, { true, (long)int.MaxValue + 1 },
        { false, long.MaxValue }, { true, long.MaxValue }
    };

    [Theory]
    [MemberData(nameof(CooperativasValidas))]
    public void AceptaIdentificadoresPositivosLong(bool actualizar, long id)
    {
        Assert.Empty(Validar(Solicitud(actualizar, cooperativaId: id)));
    }

    [Theory]
    [InlineData(false, 0L)]
    [InlineData(true, 0L)]
    [InlineData(false, -1L)]
    [InlineData(true, -1L)]
    [InlineData(false, long.MinValue)]
    [InlineData(true, long.MinValue)]
    public void RechazaCooperativaCeroONegativa(bool actualizar, long id)
    {
        AssertError(Solicitud(actualizar, cooperativaId: id), "CooperativaId");
    }

    [Theory]
    [InlineData(false, null)]
    [InlineData(true, null)]
    [InlineData(false, "")]
    [InlineData(true, "")]
    [InlineData(false, "   ")]
    [InlineData(true, "   ")]
    [InlineData(false, "\t\r\n")]
    [InlineData(true, "\t\r\n")]
    public void RechazaNumeroAusenteVacioOEnBlanco(bool actualizar, string? numero)
    {
        AssertError(Solicitud(actualizar, numero: numero), "NumeroResolucion");
    }

    [Theory]
    [InlineData(false, 1)]
    [InlineData(true, 1)]
    [InlineData(false, 100)]
    [InlineData(true, 100)]
    public void AceptaNumeroHastaCienCaracteres(bool actualizar, int longitud)
    {
        Assert.Empty(Validar(Solicitud(actualizar, numero: new string('R', longitud))));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void RechazaNumeroSuperiorACienCaracteres(bool actualizar)
    {
        AssertError(Solicitud(actualizar, numero: new string('R', 101)), "NumeroResolucion");
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void AceptaFechaYArchivoNulos(bool actualizar)
    {
        Assert.Empty(Validar(Solicitud(actualizar)));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void AceptaDateOnlyIncluidasFechasFuturas(bool actualizar)
    {
        Assert.Empty(Validar(Solicitud(actualizar, fecha: new DateOnly(2024, 2, 29))));
        Assert.Empty(Validar(Solicitud(actualizar, fecha: DateOnly.MaxValue)));
    }

    [Theory]
    [InlineData(false, 0)]
    [InlineData(true, 0)]
    [InlineData(false, 500)]
    [InlineData(true, 500)]
    public void AceptaArchivoOpcionalHastaQuinientosCaracteresSinExigirFormatoUrl(bool actualizar, int longitud)
    {
        Assert.Empty(Validar(Solicitud(actualizar, archivo: new string('a', longitud))));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void RechazaArchivoSuperiorAQuinientosCaracteres(bool actualizar)
    {
        AssertError(Solicitud(actualizar, archivo: new string('a', 501)), "ArchivoUrl");
    }

    [Fact]
    public void ActualizacionAceptaFalseSinConfundirloConAusencia()
    {
        var dto = new ActualizarResolucionAntDto
        {
            CooperativaId = 1, NumeroResolucion = "ANT-001", Activa = false
        };
        Assert.Empty(Validar(dto));
        Assert.False(dto.Activa);
    }

    [Fact]
    public void CreacionNoExponeEstadoNiIdentificadorGenerado()
    {
        var dto = new CrearResolucionAntDto { CooperativaId = 1, NumeroResolucion = "ANT-001" };
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(dto, JsonWeb));
        Assert.False(json.RootElement.TryGetProperty("activa", out _));
        Assert.False(json.RootElement.TryGetProperty("id", out _));
    }

    [Fact]
    public void CreacionConservaLongFechaYArchivoEnJson()
    {
        var dto = new CrearResolucionAntDto
        {
            CooperativaId = long.MaxValue, NumeroResolucion = "ANT-001",
            FechaResolucion = new DateOnly(2024, 2, 29), ArchivoUrl = "documentos/ANT-001.pdf"
        };
        var json = JsonSerializer.Serialize(dto, JsonWeb);
        using var documento = JsonDocument.Parse(json);
        Assert.Equal(long.MaxValue, documento.RootElement.GetProperty("cooperativaId").GetInt64());
        Assert.Equal("2024-02-29", documento.RootElement.GetProperty("fechaResolucion").GetString());
        var copia = JsonSerializer.Deserialize<CrearResolucionAntDto>(json, JsonWeb)!;
        Assert.Equal(dto.CooperativaId, copia.CooperativaId);
        Assert.Equal(dto.NumeroResolucion, copia.NumeroResolucion);
        Assert.Equal(dto.FechaResolucion, copia.FechaResolucion);
        Assert.Equal(dto.ArchivoUrl, copia.ArchivoUrl);
        Assert.Empty(Validar(copia));
    }

    [Fact]
    public void ActualizacionConservaFalseYNulosExplicitosEnJson()
    {
        const string json = """
            {"cooperativaId":9223372036854775807,"numeroResolucion":"ANT-001",
             "fechaResolucion":null,"archivoUrl":null,"activa":false}
            """;
        var dto = JsonSerializer.Deserialize<ActualizarResolucionAntDto>(json, JsonWeb)!;
        Assert.Equal(long.MaxValue, dto.CooperativaId);
        Assert.False(dto.Activa);
        Assert.Null(dto.FechaResolucion);
        Assert.Null(dto.ArchivoUrl);
        Assert.Empty(Validar(dto));
        using var copia = JsonDocument.Parse(JsonSerializer.Serialize(dto, JsonWeb));
        Assert.False(copia.RootElement.GetProperty("activa").GetBoolean());
        Assert.Equal(JsonValueKind.Null, copia.RootElement.GetProperty("fechaResolucion").ValueKind);
        Assert.Equal(JsonValueKind.Null, copia.RootElement.GetProperty("archivoUrl").ValueKind);
    }

    [Fact]
    public void ActualizacionConservaFechaYArchivoAlSerializarYDeserializar()
    {
        var dto = new ActualizarResolucionAntDto
        {
            CooperativaId = (long)int.MaxValue + 1, NumeroResolucion = "ANT-002", Activa = true,
            FechaResolucion = new DateOnly(2025, 12, 31), ArchivoUrl = "referencia interna sin formato URL"
        };
        var copia = JsonSerializer.Deserialize<ActualizarResolucionAntDto>(JsonSerializer.Serialize(dto, JsonWeb), JsonWeb)!;
        Assert.Equal(dto.CooperativaId, copia.CooperativaId);
        Assert.Equal(dto.NumeroResolucion, copia.NumeroResolucion);
        Assert.Equal(dto.FechaResolucion, copia.FechaResolucion);
        Assert.Equal(dto.ArchivoUrl, copia.ArchivoUrl);
        Assert.True(copia.Activa);
        Assert.Empty(Validar(copia));
    }

    [Fact]
    public void RespuestaConservaTodosLosCamposEnJson()
    {
        var dto = new ResolucionAntDto
        {
            Id = long.MaxValue, CooperativaId = (long)int.MaxValue + 1,
            NumeroResolucion = "ANT-003", FechaResolucion = new DateOnly(2026, 1, 2),
            ArchivoUrl = "documentos/resolucion.pdf", Activa = false
        };
        var copia = JsonSerializer.Deserialize<ResolucionAntDto>(JsonSerializer.Serialize(dto, JsonWeb), JsonWeb)!;
        Assert.Equal(dto.Id, copia.Id);
        Assert.Equal(dto.CooperativaId, copia.CooperativaId);
        Assert.Equal(dto.NumeroResolucion, copia.NumeroResolucion);
        Assert.Equal(dto.FechaResolucion, copia.FechaResolucion);
        Assert.Equal(dto.ArchivoUrl, copia.ArchivoUrl);
        Assert.False(copia.Activa);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void CamposOpcionalesOmitidosSeInterpretanComoNull(bool actualizar)
    {
        const string creacion = """{"cooperativaId":1,"numeroResolucion":"ANT-001"}""";
        const string actualizacion = """{"cooperativaId":1,"numeroResolucion":"ANT-001","activa":false}""";
        if (actualizar)
        {
            var dto = JsonSerializer.Deserialize<ActualizarResolucionAntDto>(actualizacion, JsonWeb)!;
            Assert.Null(dto.FechaResolucion);
            Assert.Null(dto.ArchivoUrl);
            Assert.Empty(Validar(dto));
        }
        else
        {
            var dto = JsonSerializer.Deserialize<CrearResolucionAntDto>(creacion, JsonWeb)!;
            Assert.Null(dto.FechaResolucion);
            Assert.Null(dto.ArchivoUrl);
            Assert.Empty(Validar(dto));
        }
    }

    [Fact]
    public void RespuestaConservaOpcionalesNulosYSoloLosSeisCamposDelContrato()
    {
        var dto = new ResolucionAntDto { Id = 1, CooperativaId = 2, NumeroResolucion = "ANT-004", Activa = true };
        var json = JsonSerializer.Serialize(dto, JsonWeb);
        using var documento = JsonDocument.Parse(json);
        Assert.Equal(6, documento.RootElement.EnumerateObject().Count());
        Assert.Equal(JsonValueKind.Null, documento.RootElement.GetProperty("fechaResolucion").ValueKind);
        Assert.Equal(JsonValueKind.Null, documento.RootElement.GetProperty("archivoUrl").ValueKind);
        var copia = JsonSerializer.Deserialize<ResolucionAntDto>(json, JsonWeb)!;
        Assert.Null(copia.FechaResolucion);
        Assert.Null(copia.ArchivoUrl);
        Assert.True(copia.Activa);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void JsonSinNumeroDeserializaPeroNoSuperaDataAnnotations(bool actualizar)
    {
        object dto = actualizar
            ? JsonSerializer.Deserialize<ActualizarResolucionAntDto>("""{"cooperativaId":1,"activa":true}""", JsonWeb)!
            : JsonSerializer.Deserialize<CrearResolucionAntDto>("""{"cooperativaId":1}""", JsonWeb)!;
        AssertError(dto, "NumeroResolucion");
    }

    [Theory]
    [InlineData("""{"numeroResolucion":"ANT-001"}""")]
    [InlineData("""{"cooperativaId":null,"numeroResolucion":"ANT-001"}""")]
    [InlineData("""{"cooperativaId":9223372036854775808,"numeroResolucion":"ANT-001"}""")]
    public void CreacionRechazaCooperativaOmitidaNulaOFueraDeLong(string json)
    {
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<CrearResolucionAntDto>(json, JsonWeb));
    }

    [Theory]
    [InlineData("""{"cooperativaId":1,"numeroResolucion":"ANT-001"}""")]
    [InlineData("""{"cooperativaId":1,"numeroResolucion":"ANT-001","activa":null}""")]
    [InlineData("""{"numeroResolucion":"ANT-001","activa":false}""")]
    [InlineData("""{"cooperativaId":null,"numeroResolucion":"ANT-001","activa":false}""")]
    public void ActualizacionRechazaCamposObligatoriosOmitidosONulos(string json)
    {
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<ActualizarResolucionAntDto>(json, JsonWeb));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void RechazaFechaJsonInvalidaSinConvertirlaEnOtroDia(bool actualizar)
    {
        const string json = """
            {"cooperativaId":1,"numeroResolucion":"ANT-001","fechaResolucion":"2025-02-29","activa":true}
            """;
        if (actualizar) Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<ActualizarResolucionAntDto>(json, JsonWeb));
        else Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<CrearResolucionAntDto>(json, JsonWeb));
    }

    private static object Solicitud(bool actualizar, long cooperativaId = 1,
        string? numero = "ANT-001", DateOnly? fecha = null, string? archivo = null)
        => actualizar
            ? new ActualizarResolucionAntDto
            {
                CooperativaId = cooperativaId, NumeroResolucion = numero!, FechaResolucion = fecha,
                ArchivoUrl = archivo, Activa = false
            }
            : new CrearResolucionAntDto
            {
                CooperativaId = cooperativaId, NumeroResolucion = numero!, FechaResolucion = fecha,
                ArchivoUrl = archivo
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
