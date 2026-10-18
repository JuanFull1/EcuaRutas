using EcuaRutas.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Data;

public static class DevelopmentSeeder
{
    public static async Task SeedAsync(
        IServiceProvider services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        if (!environment.IsDevelopment())
        {
            return;
        }

        var password = configuration["SeedUsers:Password"];

        if (string.IsNullOrWhiteSpace(password))
        {
            Console.WriteLine(
                "SeedUsers:Password no está configurado. " +
                "No se crearán usuarios de desarrollo."
            );

            return;
        }

        using var scope = services.CreateScope();

        var context =
            scope.ServiceProvider
                .GetRequiredService<EcuaRutasDbContext>();

        var passwordHasher =
            scope.ServiceProvider
                .GetRequiredService<
                    IPasswordHasher<Usuario>
                >();

        var codigosRoles = new[]
        {
            "ADMIN",
            "COOPERATIVA",
            "OFICINISTA",
            "CLIENTE",
            "BUS"
        };

        var roles = await context.Roles
            .Where(r => codigosRoles.Contains(r.Codigo))
            .ToDictionaryAsync(r => r.Codigo);

        var rolesFaltantes =
            codigosRoles
                .Where(codigo => !roles.ContainsKey(codigo))
                .ToList();

        if (rolesFaltantes.Count > 0)
        {
            throw new InvalidOperationException(
                "Faltan roles requeridos en la base de datos: " +
                string.Join(", ", rolesFaltantes)
            );
        }

        var cooperativa =
            await context.Cooperativas
                .OrderBy(c => c.Id)
                .FirstOrDefaultAsync();

        var usuarios = new[]
        {
            new UsuarioSeed(
                "admin@ecuarutas.local",
                "Administrador",
                "EcuaRutas",
                "ADMIN",
                false
            ),

            new UsuarioSeed(
                "cooperativa@ecuarutas.local",
                "Usuario",
                "Cooperativa",
                "COOPERATIVA",
                true
            ),

            new UsuarioSeed(
                "oficinista@ecuarutas.local",
                "Usuario",
                "Oficinista",
                "OFICINISTA",
                true
            ),

            new UsuarioSeed(
                "cliente@ecuarutas.local",
                "Usuario",
                "Cliente",
                "CLIENTE",
                false
            ),

            new UsuarioSeed(
                "bus@ecuarutas.local",
                "Usuario",
                "Bus",
                "BUS",
                true
            )
        };

        foreach (var item in usuarios)
        {
            var usuario =
                await context.Usuarios
                    .FirstOrDefaultAsync(
                        u => u.Correo == item.Correo
                    );

            if (usuario is null)
            {
                usuario = new Usuario
                {
                    Correo = item.Correo,
                    Nombres = item.Nombres,
                    Apellidos = item.Apellidos,
                    RolId = roles[item.Rol].Id,
                    CooperativaId =
                        item.RequiereCooperativa
                            ? cooperativa?.Id
                            : null,
                    Activo = true,
                    CreadoEn = DateTime.UtcNow,
                    ActualizadoEn = DateTime.UtcNow
                };

                usuario.PasswordHash =
                    passwordHasher.HashPassword(
                        usuario,
                        password
                    );

                context.Usuarios.Add(usuario);
            }
            else
            {
                usuario.RolId = roles[item.Rol].Id;

                usuario.PasswordHash =
                    passwordHasher.HashPassword(
                        usuario,
                        password
                    );

                usuario.Activo = true;
                usuario.ActualizadoEn = DateTime.UtcNow;

                if (item.RequiereCooperativa)
                {
                    usuario.CooperativaId ??=
                        cooperativa?.Id;
                }
            }
        }

        await context.SaveChangesAsync();

        Console.WriteLine(
            "Usuarios de desarrollo preparados correctamente."
        );
    }

    private sealed record UsuarioSeed(
        string Correo,
        string Nombres,
        string Apellidos,
        string Rol,
        bool RequiereCooperativa
    );
}