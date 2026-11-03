
using EcuaRutas.Api.DTOs.Cliente;
using EcuaRutas.Api.DTOs.Ventas;

namespace EcuaRutas.Api.Services;

public class ClienteService
{
    private readonly DisponibilidadService _disponibilidadService;

    public ClienteService(
        DisponibilidadService disponibilidadService)
    {
        _disponibilidadService = disponibilidadService;
    }

    public async Task<List<ViajeClienteDto>> BuscarViajesAsync(
        BuscarViajesClienteDto filtros)
    {
        if (filtros.OrigenLugarId is null or <= 0)
        {
            throw new ArgumentException(
                "Debe seleccionar un origen válido.");
        }

        if (filtros.DestinoLugarId is null or <= 0)
        {
            throw new ArgumentException(
                "Debe seleccionar un destino válido.");
        }

        if (filtros.OrigenLugarId == filtros.DestinoLugarId)
        {
            throw new ArgumentException(
                "El origen y destino no pueden ser iguales.");
        }

        if (!filtros.Fecha.HasValue)
        {
            throw new ArgumentException(
                "Debe seleccionar una fecha de viaje.");
        }

        if (filtros.PrecioMaximo < 0)
        {
            throw new ArgumentException(
                "El precio máximo no puede ser negativo.");
        }

        if (filtros.CooperativaId <= 0)
        {
            throw new ArgumentException(
                "La cooperativa seleccionada no es válida.");
        }

        // Reutilizar la búsqueda existente del módulo de ventas.
        List<ViajeDisponibilidadResponse> viajes =
            await _disponibilidadService.BuscarViajesAsync(
                filtros.OrigenLugarId.Value,
                filtros.DestinoLugarId.Value,
                filtros.Fecha.Value
            );

        // Convertir los resultados al DTO del cliente.
        var resultado = viajes.Select(v => new ViajeClienteDto
        {
            ViajeId = v.ViajeId,
            FrecuenciaId = v.FrecuenciaId,
            RutaId = v.RutaId,
            RutaNombre = v.RutaNombre,
            CodigoFrecuencia = v.CodigoFrecuencia,
            SalidaProgramada = v.SalidaProgramada,
            Estado = v.Estado,
            BusId = v.BusId,
            NumeroInternoBus = v.NumeroInternoBus,
            PlacaBus = v.PlacaBus,
            CapacidadBus = v.CapacidadBus,
            OrigenRutaParadaId = v.OrigenRutaParadaId,
            DestinoRutaParadaId = v.DestinoRutaParadaId,
            PrecioBase = v.PrecioBase,
            Cooperativa = v.Cooperativa
        });

        // Filtrar por precio máximo.
        if (filtros.PrecioMaximo.HasValue)
        {
            resultado = resultado.Where(v =>
                v.PrecioBase <= filtros.PrecioMaximo.Value);
        }

        // Filtrar por cooperativa.
        // El DTO existente expone el nombre, no su ID.
        // Se admite provisionalmente el nombre en una
        // búsqueda independiente cuando se amplíe el contrato.
        if (filtros.CooperativaId.HasValue)
        {
            throw new NotSupportedException(
                "El filtro por ID de cooperativa todavía " +
                "requiere integrar el identificador " +
                "en la respuesta de disponibilidad.");
        }

        // El filtro por tipo de asiento requiere consultar
        // los asientos disponibles del viaje.
        if (!string.IsNullOrWhiteSpace(filtros.TipoAsiento))
        {
            throw new NotSupportedException(
                "El filtro por tipo de asiento todavía " +
                "requiere integrar la disponibilidad " +
                "de asientos por viaje.");
        }

        return resultado
            .OrderBy(v => v.SalidaProgramada)
            .ThenBy(v => v.PrecioBase)
            .ToList();
    }
}
