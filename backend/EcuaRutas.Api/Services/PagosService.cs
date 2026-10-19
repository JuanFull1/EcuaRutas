
using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Pagos;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Services;

public class PagosService
{
    private readonly EcuaRutasDbContext _context;

    public PagosService(EcuaRutasDbContext context)
    {
        _context = context;
    }

    public async Task<Pago> RegistrarPagoAsync(
        RegistrarPagoDto dto,
        long usuarioId)
    {
        if (dto.VentaId <= 0)
        {
            throw new ArgumentException(
                "El identificador de venta no es válido.");
        }

        if (string.IsNullOrWhiteSpace(dto.Metodo) ||
            (dto.Metodo != "TRANSFERENCIA" &&
             dto.Metodo != "DEPOSITO"))
        {
            throw new ArgumentException(
                "El método debe ser TRANSFERENCIA o DEPOSITO.");
        }

        var venta = await _context.Ventas
            .FirstOrDefaultAsync(v => v.Id == dto.VentaId);

        if (venta == null)
        {
            throw new KeyNotFoundException(
                "La venta no existe.");
        }

        if (venta.UsuarioClienteId != usuarioId)
        {
            throw new UnauthorizedAccessException(
                "No tienes autorización para pagar esta venta.");
        }

        if (venta.Estado != "RESERVADA" &&
            venta.Estado != "PENDIENTE_PAGO")
        {
            throw new InvalidOperationException(
                "La venta no permite registrar un pago.");
        }

        if (venta.ExpiraEn.HasValue &&
            venta.ExpiraEn.Value < DateTime.UtcNow)
        {
            throw new InvalidOperationException(
                "La reserva ha expirado.");
        }

        if (venta.Total <= 0)
        {
            throw new InvalidOperationException(
                "El monto de la venta no es válido.");
        }

        bool existePagoActivo = await _context.Pagos
            .AnyAsync(p =>
                p.VentaId == venta.Id &&
                (p.Estado == "PENDIENTE" ||
                 p.Estado == "EN_REVISION" ||
                 p.Estado == "APROBADO"));

        if (existePagoActivo)
        {
            throw new InvalidOperationException(
                "La venta ya tiene un pago activo.");
        }

        var pago = new Pago
        {
            VentaId = venta.Id,
            Metodo = dto.Metodo,
            Monto = venta.Total,
            Estado = "PENDIENTE",
            CreadoEn = DateTime.UtcNow
        };

        _context.Pagos.Add(pago);
        await _context.SaveChangesAsync();

        return pago;
    }
    
public async Task<List<PagoRespuestaDto>> ObtenerPagosPorVentaAsync(
    long ventaId,
    long usuarioId)
{
    if (ventaId <= 0)
    {
        throw new ArgumentException("El ID de la venta no es válido.");
    }

    var venta = await _context.Ventas
        .AsNoTracking()
        .FirstOrDefaultAsync(v => v.Id == ventaId);

    if (venta is null)
    {
        throw new KeyNotFoundException("La venta no existe.");
    }

    if (venta.UsuarioClienteId != usuarioId)
    {
        throw new UnauthorizedAccessException(
            "No tienes permiso para consultar esta venta.");
    }

    return await _context.Pagos
        .AsNoTracking()
        .Where(p => p.VentaId == ventaId)
        .OrderByDescending(p => p.CreadoEn)
        .Select(p => new PagoRespuestaDto
        {
            Id = p.Id,
            VentaId = p.VentaId,
            Metodo = p.Metodo,
            Monto = p.Monto,
            Estado = p.Estado,
            CreadoEn = p.CreadoEn
        })
        .ToListAsync();
}

}
