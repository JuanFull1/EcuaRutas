
using EcuaRutas.Api.DTOs.Cliente;
using EcuaRutas.Api.DTOs.Ventas;
using EcuaRutas.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Services;

public class ClienteService
{
    private readonly DisponibilidadService _disponibilidadService;
    private readonly EcuaRutasDbContext _context;

    public ClienteService(
        DisponibilidadService disponibilidadService,
        EcuaRutasDbContext context)
    {
        _disponibilidadService = disponibilidadService;
        _context = context;
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

    public async Task<List<ResumenCompraClienteDto>>
        ObtenerHistorialComprasAsync(long usuarioClienteId)
    {
        if (usuarioClienteId <= 0)
        {
            throw new ArgumentException(
                "El identificador del cliente no es válido.");
        }

        var compras = await _context.Ventas
            .AsNoTracking()
            .Where(v =>
                v.UsuarioClienteId == usuarioClienteId)
            .OrderByDescending(v => v.CreadoEn)
            .ThenByDescending(v => v.Id)
            .Select(v => new ResumenCompraClienteDto
            {
                VentaId = v.Id,
                Codigo = v.Codigo,
                ViajeId = v.ViajeId,
                Estado = v.Estado,
                Canal = v.Canal,
                Subtotal = v.Subtotal,
                DescuentoTotal = v.DescuentoTotal,
                Total = v.Total,
                CreadoEn = v.CreadoEn,
                ExpiraEn = v.ExpiraEn
            })
            .ToListAsync();

        return compras;
    }

    public async Task<List<DetalleBoletoClienteDto>>
        ObtenerBoletosClienteAsync(long usuarioClienteId)
    {
        if (usuarioClienteId <= 0)
        {
            throw new ArgumentException(
                "El identificador del cliente no es válido.");
        }

        var boletos = await _context.Boletos
            .AsNoTracking()
            .Where(b =>
                b.VentaAsiento.Venta.UsuarioClienteId
                    == usuarioClienteId)
            .OrderByDescending(b => b.GeneradoEn)
            .Select(b => new DetalleBoletoClienteDto
            {
                BoletoId = b.Id,

                VentaId = b.VentaAsiento.VentaId,

                CodigoVenta =
                    b.VentaAsiento.Venta.Codigo,

                CodigoBoleto = b.CodigoBoleto,

                EstadoBoleto = b.Estado,

                GeneradoEn = b.GeneradoEn,

                ArchivoUrl = b.ArchivoUrl,

                ViajeId = b.VentaAsiento.ViajeId,

                SalidaProgramada =
                    b.VentaAsiento.Viaje.SalidaProgramada,

                PasajeroId = b.VentaAsiento.PasajeroId,

                AsientoBusId = b.VentaAsiento.AsientoBusId,

                PrecioFinal = b.VentaAsiento.PrecioFinal
            })
            .ToListAsync();

        return boletos;
    }
}
