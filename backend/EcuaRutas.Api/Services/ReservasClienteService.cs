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

    public Task<string?> ObtenerDocumentoAsync(long usuarioId)
    {
        return _context.Usuarios
            .AsNoTracking()
            .Where(u => u.Id == usuarioId && u.Activo)
            .Select(u => u.Pasajero != null ? u.Pasajero.Documento : u.Cedula)
            .FirstOrDefaultAsync();
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

        var cedulaCuentaValida = EsCedulaDeDiezDigitos(usuario.Cedula);
        if (cedulaCuentaValida &&
            !string.Equals(usuario.Cedula!.Trim(), documento, StringComparison.Ordinal))
            throw new InvalidOperationException("La cédula ingresada no coincide con la registrada en tu cuenta.");

        var pasajero = usuario.Pasajero;
        if (pasajero is null)
        {
            pasajero = await _context.Pasajeros.FirstOrDefaultAsync(p => p.Documento == documento);
            if (pasajero is not null && pasajero.UsuarioId != null && pasajero.UsuarioId != usuarioId)
                throw new InvalidOperationException("Ese documento ya está asociado a otra cuenta.");

            if (pasajero is null)
            {
                if (await _context.Usuarios.AnyAsync(u => u.Id != usuario.Id && u.Cedula == documento))
                    throw new InvalidOperationException("Esa cédula ya está asociada a otra cuenta.");

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

        }
        else if (!string.Equals(pasajero.Documento, documento, StringComparison.Ordinal) &&
                 EsCedulaDeDiezDigitos(pasajero.Documento))
        {
            throw new InvalidOperationException("El documento ingresado no coincide con el perfil de pasajero de tu cuenta.");
        }

        if (!EsCedulaDeDiezDigitos(usuario.Cedula))
        {
            if (await _context.Usuarios.AnyAsync(u => u.Id != usuario.Id && u.Cedula == documento))
                throw new InvalidOperationException("Esa cédula ya está asociada a otra cuenta.");
            usuario.Cedula = documento;
        }

        if (pasajero is not null && !EsCedulaDeDiezDigitos(pasajero.Documento))
        {
            if (await _context.Pasajeros.AnyAsync(p => p.Id != pasajero.Id && p.Documento == documento))
                throw new InvalidOperationException("Esa cédula ya está asociada a otro pasajero.");
            pasajero.Documento = documento;
            pasajero.TipoDocumento = "CEDULA";
        }

        await _context.SaveChangesAsync();

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

    private static bool EsCedulaDeDiezDigitos(string? valor) =>
        valor is { Length: 10 } && valor.All(char.IsDigit);
}
