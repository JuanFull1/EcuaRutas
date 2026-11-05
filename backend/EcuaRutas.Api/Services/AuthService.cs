using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Auth;
using EcuaRutas.Api.Models;
using EcuaRutas.Api.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Services;

public class AuthService
{
    private readonly EcuaRutasDbContext _context;
    private readonly IPasswordHasher<Usuario> _passwordHasher;
    private readonly JwtService _jwtService;

    public AuthService(
        EcuaRutasDbContext context,
        IPasswordHasher<Usuario> passwordHasher,
        JwtService jwtService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtService = jwtService;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var correo = request.Correo
            .Trim()
            .ToLower();

        var usuario = await _context.Usuarios
            .Include(u => u.Rol)
            .FirstOrDefaultAsync(
                u => u.Correo.ToLower() == correo
                     && u.Activo
            );

        if (usuario is null)
        {
            return null;
        }

        var resultado =
            _passwordHasher.VerifyHashedPassword(
                usuario,
                usuario.PasswordHash,
                request.Password
            );

        if (resultado == PasswordVerificationResult.Failed)
        {
            return null;
        }

        if (resultado ==
            PasswordVerificationResult.SuccessRehashNeeded)
        {
            usuario.PasswordHash =
                _passwordHasher.HashPassword(
                    usuario,
                    request.Password
                );

            usuario.ActualizadoEn = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        var jwt = _jwtService.GenerarToken(usuario);

        return new LoginResponse
        {
            Token = jwt.Token,
            ExpiraEn = jwt.ExpiraEn,

            Usuario = new UsuarioAuthDto
            {
                Id = usuario.Id,
                Nombres = usuario.Nombres,
                Apellidos = usuario.Apellidos,
                Correo = usuario.Correo,
                Rol = usuario.Rol.Codigo,
                CooperativaId = usuario.CooperativaId
            }
        };
    }
}