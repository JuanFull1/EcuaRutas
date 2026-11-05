using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.DTOs;
using Xunit;

namespace EcuaRutas.Api.Tests.Services;

// Reglas de validación al editar el nombre y el baño de una plantilla (sin base de datos).
public class ActualizarPlantillaRequestTests
{
    private static List<ValidationResult> Validar(ActualizarPlantillaBusRequest modelo)
    {
        var resultados = new List<ValidationResult>();
        Validator.TryValidateObject(modelo, new ValidationContext(modelo), resultados, validateAllProperties: true);
        return resultados;
    }

    [Theory]
    [InlineData("Bus 40 asientos", true)]
    [InlineData("Ejecutivo", false)]
    public void AceptaNombreValido(string nombre, bool tieneBanio)
    {
        Assert.Empty(Validar(new ActualizarPlantillaBusRequest { Nombre = nombre, TieneBanio = tieneBanio }));
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void RechazaNombreVacio(string? nombre)
    {
        var errores = Validar(new ActualizarPlantillaBusRequest { Nombre = nombre! });
        Assert.Contains(errores, e => e.MemberNames.Contains(nameof(ActualizarPlantillaBusRequest.Nombre)));
    }

    [Fact]
    public void RechazaNombreDeMasDeCientoVeinteCaracteres()
    {
        var errores = Validar(new ActualizarPlantillaBusRequest { Nombre = new string('a', 121) });
        Assert.Contains(errores, e => e.MemberNames.Contains(nameof(ActualizarPlantillaBusRequest.Nombre)));
    }
}
