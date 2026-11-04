using System.Security.Cryptography;
using EcuaRutas.Api.Data;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Services;

public sealed class BoletosService
{
    private readonly EcuaRutasDbContext _context;

    public BoletosService(EcuaRutasDbContext context) => _context = context;

    /// <summary>
    /// Emite un boleto por asiento pagado. Es idempotente: si el boleto ya existe,
    /// devuelve el código existente sin crear otro.
    /// El llamador debe guardar los cambios dentro de su transacción de pago.
    /// </summary>
    public async Task<List<string>> EmitirParaVentaAsync(
        Venta venta,
        DateTime generadoEn,
        CancellationToken cancellationToken = default)
    {
        if (venta.Estado != "PAGADA")
            throw new InvalidOperationException("Solo se emiten boletos para ventas pagadas.");
        if (venta.VentaAsientos.Count == 0)
            throw new InvalidOperationException("La venta no tiene asientos para emitir boletos.");

        var codigos = new List<string>(venta.VentaAsientos.Count);
        foreach (var asiento in venta.VentaAsientos)
        {
            var boleto = asiento.Boleto ?? await _context.Boletos
                .FirstOrDefaultAsync(b => b.VentaAsientoId == asiento.Id, cancellationToken);

            if (boleto is null)
            {
                boleto = new Boleto
                {
                    VentaAsientoId = asiento.Id,
                    CodigoBoleto = $"{venta.Codigo}-{asiento.AsientoBus.Numero}",
                    QrToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)),
                    Estado = "ACTIVO",
                    GeneradoEn = generadoEn
                };
                _context.Boletos.Add(boleto);
                asiento.Boleto = boleto;
            }

            codigos.Add(boleto.CodigoBoleto);
        }

        return codigos;
    }
}
