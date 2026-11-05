using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Ventas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/boletos-oficina")]
[Authorize(Roles = "OFICINISTA")]
public sealed class BoletosOficinaController : ControllerBase
{
    private readonly EcuaRutasDbContext _context;

    public BoletosOficinaController(
        EcuaRutasDbContext context)
    {
        _context = context;
    }

    [HttpGet("venta/{ventaId:long}")]
    public async Task<ActionResult<List<BoletoOficinaDto>>>
        ObtenerPorVenta(
            long ventaId,
            CancellationToken ct)
    {
        if (ventaId <= 0)
        {
            return BadRequest(new
            {
                mensaje =
                    "El identificador de la venta no es válido."
            });
        }

        var existeVenta =
            await _context.Ventas
                .AsNoTracking()
                .AnyAsync(
                    venta => venta.Id == ventaId,
                    ct
                );

        if (!existeVenta)
        {
            return NotFound(new
            {
                mensaje =
                    "La venta indicada no existe."
            });
        }

        var boletos =
            await _context.Boletos
                .AsNoTracking()
                .Where(
                    boleto =>
                        boleto.VentaAsiento.VentaId ==
                        ventaId
                )
                .OrderBy(
                    boleto =>
                        boleto.VentaAsiento.AsientoBus.Numero
                )
                .Select(
                    boleto =>
                        new BoletoOficinaDto
                        {
                            BoletoId =
                                boleto.Id,

                            VentaId =
                                boleto.VentaAsiento.VentaId,

                            CodigoVenta =
                                boleto.VentaAsiento
                                    .Venta.Codigo,

                            CodigoBoleto =
                                boleto.CodigoBoleto,

                            QrToken =
                                boleto.QrToken,

                            EstadoBoleto =
                                boleto.Estado,

                            GeneradoEn =
                                boleto.GeneradoEn,

                            ViajeId =
                                boleto.VentaAsiento.ViajeId,

                            RutaNombre =
                                boleto.VentaAsiento
                                    .Viaje
                                    .Frecuencia
                                    .Ruta
                                    .Nombre,

                            Origen =
                                boleto.VentaAsiento
                                    .OrigenRutaParada
                                    .Lugar
                                    .Nombre,

                            Destino =
                                boleto.VentaAsiento
                                    .DestinoRutaParada
                                    .Lugar
                                    .Nombre,

                            SalidaProgramada =
                                boleto.VentaAsiento
                                    .Viaje
                                    .SalidaProgramada,

                            Pasajero =
                                boleto.VentaAsiento
                                    .Pasajero.Nombres
                                + " "
                                + boleto.VentaAsiento
                                    .Pasajero.Apellidos,

                            Documento =
                                boleto.VentaAsiento
                                    .Pasajero.Documento,

                            AsientoBusId =
                                boleto.VentaAsiento
                                    .AsientoBusId,

                            NumeroAsiento =
                                boleto.VentaAsiento
                                    .AsientoBus.Numero,

                            PrecioFinal =
                                boleto.VentaAsiento
                                    .PrecioFinal
                        }
                )
                .ToListAsync(ct);

        return Ok(boletos);
    }
}