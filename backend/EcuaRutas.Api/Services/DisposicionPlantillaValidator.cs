using EcuaRutas.Api.DTOs;

namespace EcuaRutas.Api.Services;

/// <summary>
/// Revisa que la disposición de asientos de una plantilla sea coherente.
/// Devuelve la lista de errores; si está vacía, la disposición es válida.
/// </summary>
public static class DisposicionPlantillaValidator
{
    public static IReadOnlyList<string> Validar(
        int pisosPlantilla,
        IEnumerable<CrearAsientoPlantillaRequest> asientos)
    {
        var errores = new List<string>();
        var lista = asientos.ToList();

        if (lista.Count == 0)
        {
            errores.Add("La plantilla debe tener al menos un asiento.");
            return errores;
        }

        var numeros = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var posiciones = new HashSet<(int Piso, int Fila, int Columna)>();

        foreach (var asiento in lista)
        {
            var numero = asiento.Numero.Trim();

            if (!numeros.Add(numero))
            {
                errores.Add($"El número de asiento '{numero}' está repetido.");
            }

            if (asiento.Piso > pisosPlantilla)
            {
                errores.Add(
                    $"El asiento '{numero}' está en el piso {asiento.Piso}, " +
                    $"pero la plantilla solo tiene {pisosPlantilla} piso(s).");
            }

            if (asiento.Fila is null || asiento.Columna is null)
            {
                errores.Add($"El asiento '{numero}' necesita fila y columna.");
                continue;
            }

            if (!posiciones.Add((asiento.Piso, asiento.Fila.Value, asiento.Columna.Value)))
            {
                errores.Add(
                    $"La posición piso {asiento.Piso}, fila {asiento.Fila}, " +
                    $"columna {asiento.Columna} ya está ocupada (asiento '{numero}').");
            }
        }

        return errores;
    }
}