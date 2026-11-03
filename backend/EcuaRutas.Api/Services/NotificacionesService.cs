
using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Cliente;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Services;

public class NotificacionesService
{
    private readonly EcuaRutasDbContext _context;

    public NotificacionesService(
        EcuaRutasDbContext context)
    {
        _context = context;
    }

    // Obtener las notificaciones del cliente.
    public async Task<List<NotificacionClienteDto>>
        ObtenerPorUsuarioAsync(long usuarioId)
    {
        if (usuarioId <= 0)
        {
            throw new ArgumentException(
                "El identificador del usuario no es válido.");
        }

        return await _context.Notificaciones
            .AsNoTracking()
            .Where(n => n.UsuarioId == usuarioId)
            .OrderByDescending(n => n.CreadoEn)
            .ThenByDescending(n => n.Id)
            .Select(n => new NotificacionClienteDto
            {
                Id = n.Id,
                VentaId = n.VentaId,
                Tipo = n.Tipo,
                Asunto = n.Asunto,
                Estado = n.Estado,
                CreadoEn = n.CreadoEn,
                EnviadoEn = n.EnviadoEn
            })
            .ToListAsync();
    }

    // Registrar una notificación desde el backend.
    public async Task<NotificacionClienteDto>
        CrearAsync(CrearNotificacionDto solicitud)
    {
        if (solicitud.UsuarioId <= 0)
        {
            throw new ArgumentException(
                "El usuario no es válido.");
        }

        if (string.IsNullOrWhiteSpace(solicitud.Tipo))
        {
            throw new ArgumentException(
                "El tipo de notificación es obligatorio.");
        }

        if (string.IsNullOrWhiteSpace(solicitud.Asunto))
        {
            throw new ArgumentException(
                "El asunto de la notificación es obligatorio.");
        }

        var tipo = solicitud.Tipo.Trim().ToUpperInvariant();
        var asunto = solicitud.Asunto.Trim();

        if (tipo.Length > 50 || asunto.Length > 200)
        {
            throw new ArgumentException(
                "El tipo o asunto supera la longitud permitida.");
        }

        var usuario = await _context.Usuarios
            .AsNoTracking()
            .FirstOrDefaultAsync(
                u => u.Id == solicitud.UsuarioId);

        if (usuario == null)
        {
            throw new ArgumentException(
                "El usuario indicado no existe.");
        }

        if (string.IsNullOrWhiteSpace(usuario.Correo))
        {
            throw new ArgumentException(
                "El usuario no tiene un correo registrado.");
        }

        if (solicitud.VentaId.HasValue)
        {
            var ventaExiste = await _context.Ventas
                .AsNoTracking()
                .AnyAsync(v =>
                    v.Id == solicitud.VentaId.Value &&
                    v.UsuarioClienteId == solicitud.UsuarioId);

            if (!ventaExiste)
            {
                throw new ArgumentException(
                    "La venta no existe o no pertenece al usuario.");
            }
        }

        var notificacion = new Notificacione
        {
            UsuarioId = solicitud.UsuarioId,
            VentaId = solicitud.VentaId,
            CorreoDestino = usuario.Correo,
            Tipo = tipo,
            Asunto = asunto,
            Estado = "PENDIENTE",
            CreadoEn = DateTime.UtcNow,
            EnviadoEn = null
        };

        _context.Notificaciones.Add(notificacion);

        await _context.SaveChangesAsync();

        return new NotificacionClienteDto
        {
            Id = notificacion.Id,
            VentaId = notificacion.VentaId,
            Tipo = notificacion.Tipo,
            Asunto = notificacion.Asunto,
            Estado = notificacion.Estado,
            CreadoEn = notificacion.CreadoEn,
            EnviadoEn = notificacion.EnviadoEn
        };
    }
}
