using EcuaRutas.Api.Models;

namespace EcuaRutas.Api.Services;

/// <summary>
/// Comprueba referencias previamente resueltas por el servicio. No carga navegaciones,
/// consulta persistencia ni modifica entidades. Una lista vacía indica coherencia.
/// El DTO debe validarse antes de construir la frecuencia, especialmente HoraSalida.
/// No comprueba unicidad ni autoriza cambios sobre referencias operativas.
/// </summary>
public static class FrecuenciaValidator
{
    public static IReadOnlyList<string> Validar(
        Frecuencia? frecuencia, Cooperativa? cooperativa, Ruta? ruta, ResolucionesAnt? resolucion)
    {
        var errores = new List<string>();
        if (frecuencia is null)
        {
            errores.Add("La frecuencia es obligatoria.");
            return errores;
        }

        if (frecuencia.CooperativaId <= 0 || cooperativa is null || cooperativa.Id <= 0
            || cooperativa.Id != frecuencia.CooperativaId)
            errores.Add("La cooperativa resuelta no corresponde a la frecuencia o no es válida.");

        // Ruta no contiene CooperativaId: únicamente se comprueba su identidad real.
        if (frecuencia.RutaId <= 0 || ruta is null || ruta.Id <= 0 || ruta.Id != frecuencia.RutaId)
            errores.Add("La ruta resuelta no corresponde a la frecuencia o no es válida.");

        if (frecuencia.ResolucionAntId <= 0 || resolucion is null || resolucion.Id <= 0
            || resolucion.Id != frecuencia.ResolucionAntId)
            errores.Add("La resolución ANT resuelta no corresponde a la frecuencia o no es válida.");

        if (resolucion is not null && (resolucion.CooperativaId <= 0
            || resolucion.CooperativaId != frecuencia.CooperativaId))
            errores.Add("La resolución ANT debe pertenecer a la misma cooperativa que la frecuencia.");

        return errores;
    }

    /// <summary>
    /// Comprobación opcional para operaciones que exijan cooperativa, ruta y resolución
    /// activas. No es una política automática de alta, edición, baja o reactivación.
    /// El PR 6 debe decidir cuándo aplicarla y proteger la comprobación concurrente.
    /// </summary>
    public static IReadOnlyList<string> ValidarConReferenciasActivas(
        Frecuencia? frecuencia, Cooperativa? cooperativa, Ruta? ruta, ResolucionesAnt? resolucion)
    {
        var errores = Validar(frecuencia, cooperativa, ruta, resolucion).ToList();
        if (cooperativa is not null && !cooperativa.Activa) errores.Add("La cooperativa está inactiva.");
        if (ruta is not null && !ruta.Activa) errores.Add("La ruta está inactiva.");
        if (resolucion is not null && !resolucion.Activa) errores.Add("La resolución ANT está inactiva.");
        return errores;
    }

    /// <summary>
    /// Señala cambios que pueden afectar viajes, hojas de ruta, tarifas y ventas.
    /// No consulta colecciones de navegación (pueden no estar cargadas) ni permite
    /// o bloquea la actualización: el PR 6 debe consultar referencias y coordinar bloqueos.
    /// Codigo y Activa no se clasifican como estructura; sus cambios requieren su propia política.
    /// </summary>
    public static bool TieneCambiosEstructurales(Frecuencia actual, Frecuencia propuesta)
    {
        ArgumentNullException.ThrowIfNull(actual);
        ArgumentNullException.ThrowIfNull(propuesta);
        return actual.CooperativaId != propuesta.CooperativaId
            || actual.RutaId != propuesta.RutaId
            || actual.ResolucionAntId != propuesta.ResolucionAntId
            || actual.HoraSalida != propuesta.HoraSalida;
    }
}
