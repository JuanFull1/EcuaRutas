using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Ventas;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace EcuaRutas.Api.Services;

public class VentasService
{
    private readonly EcuaRutasDbContext _context;

    public VentasService(EcuaRutasDbContext context)
    {
        _context = context;
    }

    public async Task<ReservaResponse> CrearReservaAsync(
        CrearReservaRequest request)
    {
        if (request.Asientos == null || request.Asientos.Count == 0)
        {
            throw new ArgumentException(
                "Debe seleccionar al menos un asiento.");
        }

        if (request.Canal != "APP" &&
            request.Canal != "OFICINA" &&
            request.Canal != "BUS")
        {
            throw new ArgumentException(
                "El canal debe ser APP, OFICINA o BUS.");
        }

        if (request.MinutosExpiracion <= 0)
        {
            throw new ArgumentException(
                "Los minutos de expiración deben ser mayores que cero.");
        }

        var viaje = await _context.Viajes
            .Include(v => v.Bus)
            .FirstOrDefaultAsync(v => v.Id == request.ViajeId);

        if (viaje == null)
        {
            throw new ArgumentException(
                "El viaje no existe.");
        }

        if (viaje.Estado == "CANCELADO" ||
            viaje.Estado == "FINALIZADO")
        {
            throw new ArgumentException(
                "El viaje no está disponible para reservas.");
        }

        var frecuencia = await _context.Frecuencias
            .FirstOrDefaultAsync(f => f.Id == viaje.FrecuenciaId);

        if (frecuencia == null)
        {
            throw new ArgumentException(
                "La frecuencia del viaje no existe.");
        }

        var ahora = DateTime.UtcNow;
        var expiraEn = ahora.AddMinutes(
            request.MinutosExpiracion);

        var codigo = $"RES-{Guid.NewGuid():N}"
            .ToUpperInvariant();

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            var venta = new Venta
            {
                Codigo = codigo,
                ViajeId = request.ViajeId,
                UsuarioClienteId = request.UsuarioClienteId,
                UsuarioVendedorId = request.UsuarioVendedorId,
                Canal = request.Canal,
                Estado = "RESERVADA",
                Subtotal = 0,
                DescuentoTotal = 0,
                Total = 0,
                ExpiraEn = expiraEn,
                CreadoEn = ahora,
                ActualizadoEn = ahora
            };

            _context.Ventas.Add(venta);

            await _context.SaveChangesAsync();

            decimal subtotal = 0;
            decimal descuentoTotal = 0;

            var respuestaAsientos =
                new List<ReservaAsientoResponse>();

            foreach (var item in request.Asientos)
            {
                var origen = await _context.RutaParadas
                    .FirstOrDefaultAsync(p =>
                        p.Id == item.OrigenRutaParadaId);

                var destino = await _context.RutaParadas
                    .FirstOrDefaultAsync(p =>
                        p.Id == item.DestinoRutaParadaId);

                if (origen == null || destino == null)
                {
                    throw new ArgumentException(
                        "Una de las paradas seleccionadas no existe.");
                }

                if (origen.RutaId != frecuencia.RutaId ||
                    destino.RutaId != frecuencia.RutaId)
                {
                    throw new ArgumentException(
                        "Las paradas no pertenecen a la ruta del viaje.");
                }

                if (destino.Orden <= origen.Orden)
                {
                    throw new ArgumentException(
                        "El destino debe estar después del origen.");
                }

                var pasajero = await _context.Pasajeros
                    .FirstOrDefaultAsync(p =>
                        p.Id == item.PasajeroId);

                if (pasajero == null)
                {
                    throw new ArgumentException(
                        $"El pasajero {item.PasajeroId} no existe.");
                }

                var asiento = await _context.AsientosBus
                    .Include(a => a.TipoAsiento)
                    .FirstOrDefaultAsync(a =>
                        a.Id == item.AsientoBusId);

                if (asiento == null)
                {
                    throw new ArgumentException(
                        $"El asiento {item.AsientoBusId} no existe.");
                }

                if (!asiento.Activo)
                {
                    throw new ArgumentException(
                        $"El asiento {asiento.Numero} está inactivo.");
                }

                if (asiento.BusId != viaje.BusId)
                {
                    throw new ArgumentException(
                        $"El asiento {asiento.Numero} no pertenece al bus del viaje.");
                }

                if (!asiento.TipoAsiento.Activo)
                {
                    throw new ArgumentException(
                        $"El tipo del asiento {asiento.Numero} está inactivo.");
                }

                var tarifa = await _context.TarifasFrecuencia
                    .FirstOrDefaultAsync(t =>
                        t.FrecuenciaId == viaje.FrecuenciaId &&
                        t.OrigenRutaParadaId ==
                            item.OrigenRutaParadaId &&
                        t.DestinoRutaParadaId ==
                            item.DestinoRutaParadaId &&
                        t.Activa);

                if (tarifa == null)
                {
                    throw new ArgumentException(
                        $"No existe una tarifa activa para el tramo seleccionado del asiento {asiento.Numero}.");
                }

                var recargo =
                    tarifa.PrecioBase *
                    asiento.TipoAsiento.RecargoPorcentaje /
                    100m;

                var precioAntesDescuento =
                    tarifa.PrecioBase + recargo;

                var tipoDescuento = "NINGUNO";
                decimal porcentajeDescuento = 0;

                if (pasajero.Discapacidad)
                {
                    tipoDescuento = "DISCAPACIDAD";
                    porcentajeDescuento = 50;
                }

                var valorDescuento =
                    precioAntesDescuento *
                    porcentajeDescuento / 100m;

                var precioFinal =
                    precioAntesDescuento -
                    valorDescuento;

                var ventaAsiento = new VentaAsiento
                {
                    VentaId = venta.Id,
                    ViajeId = viaje.Id,
                    PasajeroId = pasajero.Id,
                    AsientoBusId = asiento.Id,
                    OrigenRutaParadaId =
                        origen.Id,
                    DestinoRutaParadaId =
                        destino.Id,
                    OrdenOrigen = origen.Orden,
                    OrdenDestino = destino.Orden,
                    PrecioBase = tarifa.PrecioBase,
                    RecargoAsiento = recargo,
                    TipoDescuento = tipoDescuento,
                    PorcentajeDescuento =
                        porcentajeDescuento,
                    ValorDescuento = valorDescuento,
                    PrecioFinal = precioFinal,
                    EstadoAsiento = "RETENIDO",
                    CreadoEn = ahora
                };

                _context.VentaAsientos.Add(ventaAsiento);

                subtotal += precioAntesDescuento;
                descuentoTotal += valorDescuento;

                respuestaAsientos.Add(
                    new ReservaAsientoResponse
                    {
                        PasajeroId = pasajero.Id,
                        AsientoBusId = asiento.Id,
                        NumeroAsiento = asiento.Numero,
                        PrecioBase = tarifa.PrecioBase,
                        RecargoAsiento = recargo,
                        TipoDescuento = tipoDescuento,
                        PorcentajeDescuento =
                            porcentajeDescuento,
                        ValorDescuento = valorDescuento,
                        PrecioFinal = precioFinal,
                        EstadoAsiento = "RETENIDO"
                    });
            }

            venta.Subtotal = subtotal;
            venta.DescuentoTotal = descuentoTotal;
            venta.Total = subtotal - descuentoTotal;
            venta.ActualizadoEn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            for (int i = 0;
                 i < venta.VentaAsientos.Count;
                 i++)
            {
                respuestaAsientos[i].VentaAsientoId =
                    venta.VentaAsientos.ElementAt(i).Id;
            }

            return new ReservaResponse
            {
                VentaId = venta.Id,
                Codigo = venta.Codigo,
                ViajeId = venta.ViajeId,
                Canal = venta.Canal,
                Estado = venta.Estado,
                Subtotal = venta.Subtotal,
                DescuentoTotal = venta.DescuentoTotal,
                Total = venta.Total,
                ExpiraEn = venta.ExpiraEn!.Value,
                Asientos = respuestaAsientos
            };
        }
        catch (PostgresException ex)
        {
            await transaction.RollbackAsync();

            if (ex.SqlState == "23P01")
            {
                throw new InvalidOperationException(
                    "Uno de los asientos ya está reservado o vendido para el tramo seleccionado.");
            }

            throw;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}