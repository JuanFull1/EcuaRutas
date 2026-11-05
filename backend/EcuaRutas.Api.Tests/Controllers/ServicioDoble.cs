using System.Reflection;
using EcuaRutas.Api.Services;
using Xunit;

namespace EcuaRutas.Api.Tests.Controllers;

// Dobles de los contratos, sin paquetes nuevos ni consultas de base de datos.
public class ServicioDoble<T> : DispatchProxy where T : class
{
    public readonly Dictionary<string, object?> Respuestas = [];
    public readonly List<(string Metodo, object?[] Argumentos)> Llamadas = [];
    public Exception? Error;
    public Action<string, object?[]>? AlInvocar;

    public static (T Servicio, ServicioDoble<T> Doble) Crear()
    {
        var servicio = Create<T, ServicioDoble<T>>();
        return (servicio, (ServicioDoble<T>)(object)servicio);
    }

    protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
    {
        var metodo = targetMethod!; var argumentos = args ?? [];
        Llamadas.Add((metodo.Name, argumentos));
        foreach (var token in argumentos.OfType<CancellationToken>()) token.ThrowIfCancellationRequested();
        AlInvocar?.Invoke(metodo.Name, argumentos);
        if (Error is not null) throw Error;
        var tipo = metodo.ReturnType.GenericTypeArguments.Single();
        var respuesta = Respuestas.GetValueOrDefault(metodo.Name);
        if (respuesta is null && tipo.IsValueType) respuesta = Activator.CreateInstance(tipo);
        return typeof(Task).GetMethod(nameof(Task.FromResult))!.MakeGenericMethod(tipo).Invoke(null, [respuesta]);
    }

    public void ComprobarTokens(CancellationToken ct)
    {
        Assert.NotEmpty(Llamadas);
        Assert.All(Llamadas, llamada => Assert.Equal(ct, llamada.Argumentos.OfType<CancellationToken>().Single()));
    }
}
