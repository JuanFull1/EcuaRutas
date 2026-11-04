using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Cliente;
using EcuaRutas.Api.DTOs.Ventas;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Services;

public sealed class ReservasClienteService
{
    private readonly EcuaRutasDbContext _context;
    private readonly VentasService _ventasService;

    public ReservasClienteService(EcuaRutasDbContext context, VentasService ventasService)
    {
        _context = context;
        _ventasService = ventasService;
    }

    public async Task<ReservaResponse> CrearAsync(long usuarioId, CrearReservaClienteRequest solicitud)
    {
        if (solicitud is null)
            throw new ArgumentException("Debes enviar los datos de la reserva.");
        if (usuarioId <= 0)
            throw new ArgumentException("La sesión del cliente no es válida.");

        var usuario = await _context.Usuarios
            .Include(u => u.Pasajero)
            .FirstOrDefaultAsync(u => u.Id == usuarioId && u.Activo);
        if (usuario is null)
            throw new ArgumentException("No se encontró una cuenta activa para el cliente.");

        var documento = solicitud.Documento?.Trim() ?? string.Empty;
        if (documento.Length != 10 || documento.Any(c => !char.IsDigit(c)))
            throw new ArgumentException("Ingresa una cédula ecuatoriana de 10 dígitos.");

        var pasajero = usuario.Pasajero;
        if (pasajero is null)
        {
            pasajero = await _context.Pasajeros.FirstOrDefaultAsync(p => p.Documento == documento);
            if (pasajero is not null && pasajero.UsuarioId != null && pasajero.UsuarioId != usuarioId)
                throw new InvalidOperationException("Ese documento ya está asociado a otra cuenta.");

            if (pasajero is null)
            {
                pasajero = new Pasajero
                {
                    UsuarioId = usuario.Id,
                    TipoDocumento = "CEDULA",
                    Documento = documento,
                    Nombres = usuario.Nombres,
                    Apellidos = usuario.Apellidos,
                    Correo = usuario.Correo,
                    Telefono = usuario.Telefono,
                    Discapacidad = false,
                    CreadoEn = DateTime.UtcNow
                };
                _context.Pasajeros.Add(pasajero);
            }
            else
            {
                pasajero.UsuarioId = usuario.Id;
            }

            await _context.SaveChangesAsync();
        }
        else if (!string.Equals(pasajero.Documento, documento, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("El documento ingresado no coincide con el perfil de pasajero de tu cuenta.");
        }

        return await _ventasService.CrearReservaAsync(new CrearReservaRequest
        {
            ViajeId = solicitud.ViajeId,
            UsuarioClienteId = usuario.Id,
            UsuarioVendedorId = null,
            Canal = "APP",
            MinutosExpiracion = 15,
            Asientos = new List<ReservaAsientoRequest>
            {
                new()
                {
                    PasajeroId = pasajero.Id,
                    AsientoBusId = solicitud.AsientoBusId,
                    OrigenRutaParadaId = solicitud.OrigenRutaParadaId,
                    DestinoRutaParadaId = solicitud.DestinoRutaParadaId
                }
            }
        });
    }
}
