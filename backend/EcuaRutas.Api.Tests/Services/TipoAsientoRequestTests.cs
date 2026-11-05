using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.DTOs;
using Xunit;

namespace EcuaRutas.Api.Tests.Services;

// Reglas de validación de los datos de un tipo de asiento (sin base de datos).
public class TipoAsientoRequestTests
{
    private static List<ValidationResult> Validar(object modelo)
    {
        var resultados = new List<ValidationResult>();
        Validator.TryValidateObject(modelo, new ValidationContext(modelo), resultados, validateAllProperties: true);
        return resultados;
    }

    [Theory]
    [InlineData("VIP", 0)]
    [InlineData("Preferencial", 15.5)]
    [InlineData("Ejecutivo", 100)]
    public void AceptaNombreYRecargoEnRango(string nombre, double recargo)
    {
        var request = new CrearTipoAsientoRequest { Nombre = nombre, RecargoPorcentaje = (decimal)recargo };
        Assert.Empty(Validar(request));
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void RechazaNombreVacio(string? nombre)
    {
        var request = new CrearTipoAsientoRequest { Nombre = nombre!, RecargoPorcentaje = 5 };
        Assert.Contains(Validar(request), e => e.MemberNames.Contains(nameof(CrearTipoAsientoRequest.Nombre)));
    }

    [Fact]
    public void RechazaNombreDeMasDeOchentaCaracteres()
    {
        var request = new ActualizarTipoAsientoRequest { Nombre = new string('a', 81), RecargoPorcentaje = 5 };
        Assert.Contains(Validar(request), e => e.MemberNames.Contains(nameof(ActualizarTipoAsientoRequest.Nombre)));
    }

    [Theory]
    [InlineData(-0.01)]
    [InlineData(100.01)]
    public void RechazaRecargoFueraDeRango(double recargo)
    {
        var crear = new CrearTipoAsientoRequest { Nombre = "VIP", RecargoPorcentaje = (decimal)recargo };
        var actualizar = new ActualizarTipoAsientoRequest { Nombre = "VIP", RecargoPorcentaje = (decimal)recargo };

        Assert.Contains(Validar(crear), e => e.MemberNames.Contains(nameof(CrearTipoAsientoRequest.RecargoPorcentaje)));
        Assert.Contains(Validar(actualizar), e => e.MemberNames.Contains(nameof(ActualizarTipoAsientoRequest.RecargoPorcentaje)));
    }
}
