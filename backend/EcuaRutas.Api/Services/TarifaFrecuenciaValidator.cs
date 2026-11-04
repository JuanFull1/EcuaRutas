using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.DTOs.Tarifas;
using EcuaRutas.Api.Models;

namespace EcuaRutas.Api.Services;

/// <summary>
/// Valida una tarifa candidata y referencias previamente resueltas. No realiza
/// consultas, escrituras, cálculos de ventas ni cambios en los objetos recibidos.
/// No verifica existencia en PostgreSQL, duplicados persistidos ni referencias operativas.
/// La coherencia de cooperativa/ruta/resolución de la frecuencia se comprueba aparte
/// con FrecuenciaValidator. Una lista vacía indica coherencia de los datos suministrados.
/// </summary>
public static class TarifaFrecuenciaValidator
{
    public static IReadOnlyList<string> Validar(
        TarifasFrecuencium? tarifa, Frecuencia? frecuencia, RutaParada? origen, RutaParada? destino)
    {
        var errores = new List<string>();
        if (tarifa is null)
        {
            errores.Add("La tarifa es obligatoria.");
            return errores;
        }

        // Reutiliza los límites, precisión y extremos distintos del contrato existente.
        // En el PR 6 el DTO original debe validarse antes del mapeo para detectar precio omitido.
        var contrato = new CrearTarifaFrecuenciaDto
        {
            OrigenRutaParadaId = tarifa.OrigenRutaParadaId,
            DestinoRutaParadaId = tarifa.DestinoRutaParadaId,
            PrecioBase = tarifa.PrecioBase
        };
        var validaciones = new List<ValidationResult>();
        Validator.TryValidateObject(contrato, new ValidationContext(contrato), validaciones, validateAllProperties: true);
        errores.AddRange(validaciones.Select(resultado => resultado.ErrorMessage ?? "Los datos de la tarifa no son válidos."));

        if (tarifa.FrecuenciaId <= 0 || frecuencia is null || frecuencia.Id <= 0
            || tarifa.FrecuenciaId != frecuencia.Id)
            errores.Add("La frecuencia resuelta no corresponde a la tarifa o no es válida.");

        if (frecuencia is not null && frecuencia.RutaId <= 0)
            errores.Add("La frecuencia debe identificar una ruta válida.");

        if (origen is null || origen.Id <= 0 || origen.Id != tarifa.OrigenRutaParadaId)
            errores.Add("La parada de origen resuelta no corresponde a la tarifa o no es válida.");
        if (destino is null || destino.Id <= 0 || destino.Id != tarifa.DestinoRutaParadaId)
            errores.Add("La parada de destino resuelta no corresponde a la tarifa o no es válida.");

        if (frecuencia is not null)
        {
            if (origen is not null && (origen.RutaId <= 0 || origen.RutaId != frecuencia.RutaId))
                errores.Add("La parada de origen no pertenece a la ruta de la frecuencia.");
            if (destino is not null && (destino.RutaId <= 0 || destino.RutaId != frecuencia.RutaId))
                errores.Add("La parada de destino no pertenece a la ruta de la frecuencia.");
        }

        if (origen is not null && origen.Orden < 0) errores.Add("El orden de origen no puede ser negativo.");
        if (destino is not null && destino.Orden < 0) errores.Add("El orden de destino no puede ser negativo.");
        if (origen is not null && destino is not null && origen.Orden >= destino.Orden)
            errores.Add("El orden de origen debe ser menor que el orden de destino.");

        return errores;
    }

    /// <summary>
    /// Variante explícita para operaciones que requieran frecuencia activa, como los
    /// consumidores operativos actuales. No cambia estados ni define reglas de reactivación.
    /// No exige actividad de la propia tarifa para poder validar también tarifas inactivas.
    /// </summary>
    public static IReadOnlyList<string> ValidarConFrecuenciaActiva(
        TarifasFrecuencium? tarifa, Frecuencia? frecuencia, RutaParada? origen, RutaParada? destino)
    {
        var errores = Validar(tarifa, frecuencia, origen, destino).ToList();
        if (frecuencia is not null && !frecuencia.Activa) errores.Add("La frecuencia está inactiva.");
        return errores;
    }
}
