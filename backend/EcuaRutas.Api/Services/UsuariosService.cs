using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Usuarios;
using EcuaRutas.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Services;

public class UsuariosService : IUsuariosService
{
    private readonly EcuaRutasDbContext _context;

    private readonly IPasswordHasher<Usuario>
        _passwordHasher;

    public UsuariosService(
        EcuaRutasDbContext context,
        IPasswordHasher<Usuario> passwordHasher
    )
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<IReadOnlyList<UsuarioDto>>
        ListarAsync(
            string? busqueda = null,
            long? rolId = null,
            bool? activo = null
        )
    {
        var query =
            _context.Usuarios
                .AsNoTracking()
                .AsQueryable();

        if (!string.IsNullOrWhiteSpace(busqueda))
        {
            var texto =
                busqueda
                    .Trim()
                    .ToLower();

            query = query.Where(u =>
                u.Nombres.ToLower()
                    .Contains(texto) ||
                u.Apellidos.ToLower()
                    .Contains(texto) ||
                u.Correo.ToLower()
                    .Contains(texto) ||
                (
                    u.Cedula != null &&
                    u.Cedula.ToLower()
                        .Contains(texto)
                )
            );
        }

        if (rolId.HasValue)
        {
            query = query.Where(
                u => u.RolId == rolId.Value
            );
        }

        if (activo.HasValue)
        {
            query = query.Where(
                u => u.Activo == activo.Value
            );
        }

        return await query
            .OrderBy(u => u.Nombres)
            .ThenBy(u => u.Apellidos)
            .Select(u => new UsuarioDto
            {
                Id =
                    u.Id,

                Cedula =
                    u.Cedula,

                Nombres =
                    u.Nombres,

                Apellidos =
                    u.Apellidos,

                Correo =
                    u.Correo,

                Telefono =
                    u.Telefono,

                Activo =
                    u.Activo,

                RolId =
                    u.RolId,

                RolCodigo =
                    u.Rol.Codigo,

                RolNombre =
                    u.Rol.Nombre,

                CooperativaId =
                    u.CooperativaId,

                CooperativaNombre =
                    u.Cooperativa != null
                        ? u.Cooperativa.Nombre
                        : null,

                CreadoEn =
                    u.CreadoEn,

                ActualizadoEn =
                    u.ActualizadoEn
            })
            .ToListAsync();
    }

    public async Task<UsuarioDto?>
        ObtenerPorIdAsync(
            long id
        )
    {
        return await _context.Usuarios
            .AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new UsuarioDto
            {
                Id =
                    u.Id,

                Cedula =
                    u.Cedula,

                Nombres =
                    u.Nombres,

                Apellidos =
                    u.Apellidos,

                Correo =
                    u.Correo,

                Telefono =
                    u.Telefono,

                Activo =
                    u.Activo,

                RolId =
                    u.RolId,

                RolCodigo =
                    u.Rol.Codigo,

                RolNombre =
                    u.Rol.Nombre,

                CooperativaId =
                    u.CooperativaId,

                CooperativaNombre =
                    u.Cooperativa != null
                        ? u.Cooperativa.Nombre
                        : null,

                CreadoEn =
                    u.CreadoEn,

                ActualizadoEn =
                    u.ActualizadoEn
            })
            .FirstOrDefaultAsync();
    }

    public async Task<UsuarioDto> CrearAsync(
        CrearUsuarioRequest request
    )
    {
        var correo =
            NormalizarCorreo(
                request.Correo
            );

        var cedula =
            NormalizarOpcional(
                request.Cedula
            );

        await ValidarCorreoDuplicadoAsync(
            correo
        );

        await ValidarCedulaDuplicadaAsync(
            cedula
        );

        var rol =
            await ObtenerRolAsync(
                request.RolId
            );

        await ValidarCooperativaAsync(
            rol,
            request.CooperativaId
        );

        var ahora =
            DateTime.UtcNow;

        var usuario =
            new Usuario
            {
                Cedula =
                    cedula,

                Nombres =
                    request.Nombres.Trim(),

                Apellidos =
                    request.Apellidos.Trim(),

                Correo =
                    correo,

                Telefono =
                    NormalizarOpcional(
                        request.Telefono
                    ),

                RolId =
                    request.RolId,

                CooperativaId =
                    ObtenerCooperativaAplicable(
                        rol,
                        request.CooperativaId
                    ),

                Activo =
                    request.Activo,

                CreadoEn =
                    ahora,

                ActualizadoEn =
                    ahora
            };

        usuario.PasswordHash =
            _passwordHasher.HashPassword(
                usuario,
                request.Password
            );

        _context.Usuarios.Add(
            usuario
        );

        await _context.SaveChangesAsync();

        return (
            await ObtenerPorIdAsync(
                usuario.Id
            )
        )!;
    }

    public async Task<UsuarioDto?>
        ActualizarAsync(
            long id,
            ActualizarUsuarioRequest request
        )
    {
        var usuario =
            await _context.Usuarios
                .FirstOrDefaultAsync(
                    u => u.Id == id
                );

        if (usuario is null)
        {
            return null;
        }

        var correo =
            NormalizarCorreo(
                request.Correo
            );

        var cedula =
            NormalizarOpcional(
                request.Cedula
            );

        await ValidarCorreoDuplicadoAsync(
            correo,
            id
        );

        await ValidarCedulaDuplicadaAsync(
            cedula,
            id
        );

        var rol =
            await ObtenerRolAsync(
                request.RolId
            );

        await ValidarCooperativaAsync(
            rol,
            request.CooperativaId
        );

        usuario.Cedula =
            cedula;

        usuario.Nombres =
            request.Nombres.Trim();

        usuario.Apellidos =
            request.Apellidos.Trim();

        usuario.Correo =
            correo;

        usuario.Telefono =
            NormalizarOpcional(
                request.Telefono
            );

        usuario.RolId =
            request.RolId;

        usuario.CooperativaId =
            ObtenerCooperativaAplicable(
                rol,
                request.CooperativaId
            );

        usuario.ActualizadoEn =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await ObtenerPorIdAsync(
            id
        );
    }

    public async Task<bool>
        CambiarEstadoAsync(
            long id,
            bool activo
        )
    {
        var usuario =
            await _context.Usuarios
                .FirstOrDefaultAsync(
                    u => u.Id == id
                );

        if (usuario is null)
        {
            return false;
        }

        usuario.Activo =
            activo;

        usuario.ActualizadoEn =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool>
        RestablecerPasswordAsync(
            long id,
            string nuevaPassword
        )
    {
        var usuario =
            await _context.Usuarios
                .FirstOrDefaultAsync(
                    u => u.Id == id
                );

        if (usuario is null)
        {
            return false;
        }

        usuario.PasswordHash =
            _passwordHasher.HashPassword(
                usuario,
                nuevaPassword
            );

        usuario.ActualizadoEn =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<IReadOnlyList<RolDto>>
        ListarRolesAsync()
    {
        return await _context.Roles
            .AsNoTracking()
            .OrderBy(r => r.Id)
            .Select(r => new RolDto
            {
                Id =
                    r.Id,

                Codigo =
                    r.Codigo,

                Nombre =
                    r.Nombre,

                CantidadUsuarios =
                    r.Usuarios.Count
            })
            .ToListAsync();
    }

    private async Task<Role>
        ObtenerRolAsync(
            long rolId
        )
    {
        var rol =
            await _context.Roles
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    r => r.Id == rolId
                );

        if (rol is null)
        {
            throw new InvalidOperationException(
                "El rol seleccionado no existe."
            );
        }

        return rol;
    }

    private async Task
        ValidarCorreoDuplicadoAsync(
            string correo,
            long? excluirUsuarioId = null
        )
    {
        var existe =
            await _context.Usuarios
                .AsNoTracking()
                .AnyAsync(u =>
                    u.Correo.ToLower()
                        == correo.ToLower() &&
                    (
                        !excluirUsuarioId.HasValue ||
                        u.Id != excluirUsuarioId.Value
                    )
                );

        if (existe)
        {
            throw new InvalidOperationException(
                "Ya existe un usuario con ese correo."
            );
        }
    }

    private async Task
        ValidarCedulaDuplicadaAsync(
            string? cedula,
            long? excluirUsuarioId = null
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                cedula
            )
        )
        {
            return;
        }

        var existe =
            await _context.Usuarios
                .AsNoTracking()
                .AnyAsync(u =>
                    u.Cedula == cedula &&
                    (
                        !excluirUsuarioId.HasValue ||
                        u.Id != excluirUsuarioId.Value
                    )
                );

        if (existe)
        {
            throw new InvalidOperationException(
                "Ya existe un usuario con esa cédula."
            );
        }
    }

    private async Task
        ValidarCooperativaAsync(
            Role rol,
            long? cooperativaId
        )
    {
        if (
            RequiereCooperativa(
                rol.Codigo
            ) &&
            !cooperativaId.HasValue
        )
        {
            throw new InvalidOperationException(
                $"El rol {rol.Nombre} requiere una cooperativa."
            );
        }

        if (!cooperativaId.HasValue)
        {
            return;
        }

        var existe =
            await _context.Cooperativas
                .AsNoTracking()
                .AnyAsync(c =>
                    c.Id == cooperativaId.Value &&
                    c.Activa
                );

        if (!existe)
        {
            throw new InvalidOperationException(
                "La cooperativa seleccionada no existe o está inactiva."
            );
        }
    }

    private static long?
        ObtenerCooperativaAplicable(
            Role rol,
            long? cooperativaId
        )
    {
        return RequiereCooperativa(
            rol.Codigo
        )
            ? cooperativaId
            : null;
    }

    private static bool
        RequiereCooperativa(
            string codigoRol
        )
    {
        return codigoRol is
            "COOPERATIVA"
            or "OFICINISTA"
            or "BUS";
    }

    private static string
        NormalizarCorreo(
            string correo
        )
    {
        return correo
            .Trim()
            .ToLowerInvariant();
    }

    private static string?
        NormalizarOpcional(
            string? valor
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                valor
            )
        )
        {
            return null;
        }

        return valor.Trim();
    }
}