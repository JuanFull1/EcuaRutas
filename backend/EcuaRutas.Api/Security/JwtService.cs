using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using EcuaRutas.Api.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace EcuaRutas.Api.Security;

public class JwtService
{
    private readonly JwtSettings _settings;

    public JwtService(IOptions<JwtSettings> options)
    {
        _settings = options.Value;
    }

    public (string Token, DateTime ExpiraEn) GenerarToken(Usuario usuario)
    {
        var expiraEn = DateTime.UtcNow
            .AddMinutes(_settings.ExpirationMinutes);

        var claims = new List<Claim>
        {
            new(
                ClaimTypes.NameIdentifier,
                usuario.Id.ToString()
            ),

            new(
                ClaimTypes.Name,
                $"{usuario.Nombres} {usuario.Apellidos}"
            ),

            new(
                ClaimTypes.Email,
                usuario.Correo
            ),

            new(
                ClaimTypes.Role,
                usuario.Rol.Codigo
            )
        };

        if (usuario.CooperativaId.HasValue)
        {
            claims.Add(
                new Claim(
                    "cooperativa_id",
                    usuario.CooperativaId.Value.ToString()
                )
            );
        }

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_settings.Key)
        );

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: expiraEn,
            signingCredentials: credentials
        );

        return (
            new JwtSecurityTokenHandler().WriteToken(token),
            expiraEn
        );
    }
}