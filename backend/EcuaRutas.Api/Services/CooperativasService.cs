using System.Text.Json;
using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Cooperativas;
using EcuaRutas.Api.DTOs.Usuarios;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Services;

public class CooperativasService
    : ICooperativasService
{
    private readonly EcuaRutasDbContext _context;

    private readonly IUsuariosService
        _usuariosService;

    public CooperativasService(
        EcuaRutasDbContext context,
        IUsuariosService usuariosService
    )
    {
        _context = context;
        _usuariosService = usuariosService;
    }

    public async Task<
        IReadOnlyList<CooperativaDto>
    > ListarAsync(
        string? busqueda,
        bool? activa
    )
    {
        var consulta =
            _context.Cooperativas
                .AsNoTracking()
                .AsQueryable();

        if (
            !string.IsNullOrWhiteSpace(
                busqueda
            )
        )
        {
            var texto =
                busqueda.Trim();

            consulta =
                consulta.Where(
                    c =>
                        EF.Functions.ILike(
                            c.Nombre,
                            $"%{texto}%"
                        ) ||
                        (
                            c.Ruc != null &&
                            EF.Functions.ILike(
                                c.Ruc,
                                $"%{texto}%"
                            )
                        ) ||
                        (
                            c.Correo != null &&
                            EF.Functions.ILike(
                                c.Correo,
                                $"%{texto}%"
                            )
                        )
                );
        }

        if (activa.HasValue)
        {
            consulta =
                consulta.Where(
                    c =>
                        c.Activa ==
                        activa.Value
                );
        }

        return await consulta
            .OrderBy(
                c => c.Nombre
            )
            .Select(
                c =>
                    new CooperativaDto
                    {
                        Id =
                            c.Id,

                        Nombre =
                            c.Nombre,

                        Ruc =
                            c.Ruc,

                        Descripcion =
                            c.Descripcion,

                        Telefono =
                            c.Telefono,

                        Correo =
                            c.Correo,

                        Direccion =
                            c.Direccion,

                        LogoUrl =
                            c.LogoUrl,

                        ColorPrimario =
                            c.ColorPrimario,

                        ColorSecundario =
                            c.ColorSecundario,

                        RedesSociales =
                            c.RedesSociales,

                        InformacionSoporte =
                            c.InformacionSoporte,

                        Activa =
                            c.Activa,

                        CantidadUsuarios =
                            c.Usuarios.Count,

                        CreadoEn =
                            c.CreadoEn
                    }
            )
            .ToListAsync();
    }

    public async Task<
        CooperativaDto?
    > ObtenerPorIdAsync(
        long id
    )
    {
        return await _context
            .Cooperativas
            .AsNoTracking()
            .Where(
                c => c.Id == id
            )
            .Select(
                c =>
                    new CooperativaDto
                    {
                        Id =
                            c.Id,

                        Nombre =
                            c.Nombre,

                        Ruc =
                            c.Ruc,

                        Descripcion =
                            c.Descripcion,

                        Telefono =
                            c.Telefono,

                        Correo =
                            c.Correo,

                        Direccion =
                            c.Direccion,

                        LogoUrl =
                            c.LogoUrl,

                        ColorPrimario =
                            c.ColorPrimario,

                        ColorSecundario =
                            c.ColorSecundario,

                        RedesSociales =
                            c.RedesSociales,

                        InformacionSoporte =
                            c.InformacionSoporte,

                        Activa =
                            c.Activa,

                        CantidadUsuarios =
                            c.Usuarios.Count,

                        CreadoEn =
                            c.CreadoEn
                    }
            )
            .FirstOrDefaultAsync();
    }

    public async Task<
        CrearCooperativaResponse
    > CrearAsync(
        CrearCooperativaRequest request
    )
    {
        var nombre =
            request.Nombre.Trim();

        var ruc =
            NormalizarTexto(
                request.Ruc
            );

        if (
            string.IsNullOrWhiteSpace(
                nombre
            )
        )
        {
            throw new InvalidOperationException(
                "El nombre de la cooperativa es obligatorio."
            );
        }

        if (
            request.UsuarioPassword !=
            request.UsuarioConfirmarPassword
        )
        {
            throw new InvalidOperationException(
                "Las contraseñas no coinciden."
            );
        }

        if (
            ruc != null &&
            await _context
                .Cooperativas
                .AnyAsync(
                    c =>
                        c.Ruc == ruc
                )
        )
        {
            throw new InvalidOperationException(
                "Ya existe una cooperativa con ese RUC."
            );
        }

        var rolCooperativa =
            await _context
                .Roles
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    r =>
                        r.Codigo ==
                        "COOPERATIVA"
                );

        if (rolCooperativa == null)
        {
            throw new InvalidOperationException(
                "No se encontró el rol COOPERATIVA."
            );
        }

        await using var transaccion =
            await _context
                .Database
                .BeginTransactionAsync();

        try
        {
            var cooperativa =
                new Cooperativa
                {
                    Nombre =
                        nombre,

                    Ruc =
                        ruc,

                    Descripcion =
                        null,

                    Telefono =
                        null,

                    Correo =
                        null,

                    Direccion =
                        null,

                    LogoUrl =
                        null,

                    ColorPrimario =
                        null,

                    ColorSecundario =
                        null,

                    RedesSociales =
                        "{}",

                    InformacionSoporte =
                        null,

                    Activa =
                        true,

                    CreadoEn =
                        DateTime.UtcNow
                };

            _context.Cooperativas.Add(
                cooperativa
            );

            await _context
                .SaveChangesAsync();

            var usuario =
                await _usuariosService
                    .CrearAsync(
                        new CrearUsuarioRequest
                        {
                            Cedula =
                                null,

                            Nombres =
                                request
                                    .UsuarioNombres
                                    .Trim(),

                            Apellidos =
                                request
                                    .UsuarioApellidos
                                    .Trim(),

                            Correo =
                                request
                                    .UsuarioCorreo
                                    .Trim(),

                            Telefono =
                                null,

                            Password =
                                request
                                    .UsuarioPassword,

                            RolId =
                                rolCooperativa.Id,

                            CooperativaId =
                                cooperativa.Id,

                            Activo =
                                true
                        }
                    );

            await transaccion
                .CommitAsync();

            return new CrearCooperativaResponse
            {
                Cooperativa =
                    Mapear(
                        cooperativa,
                        1
                    ),

                Usuario =
                    usuario
            };
        }
        catch
        {
            await transaccion
                .RollbackAsync();

            throw;
        }
    }

    public async Task<
        CooperativaDto?
    > ActualizarAdminAsync(
        long id,
        ActualizarCooperativaAdminRequest request
    )
    {
        var cooperativa =
            await _context
                .Cooperativas
                .FirstOrDefaultAsync(
                    c =>
                        c.Id == id
                );

        if (cooperativa == null)
        {
            return null;
        }

        var nombre =
            request.Nombre.Trim();

        var ruc =
            NormalizarTexto(
                request.Ruc
            );

        if (
            string.IsNullOrWhiteSpace(
                nombre
            )
        )
        {
            throw new InvalidOperationException(
                "El nombre de la cooperativa es obligatorio."
            );
        }

        if (
            ruc != null &&
            await _context
                .Cooperativas
                .AnyAsync(
                    c =>
                        c.Id != id &&
                        c.Ruc == ruc
                )
        )
        {
            throw new InvalidOperationException(
                "Ya existe una cooperativa con ese RUC."
            );
        }

        cooperativa.Nombre =
            nombre;

        cooperativa.Ruc =
            ruc;

        await _context
            .SaveChangesAsync();

        var cantidadUsuarios =
            await _context
                .Usuarios
                .CountAsync(
                    u =>
                        u.CooperativaId ==
                        cooperativa.Id
                );

        return Mapear(
            cooperativa,
            cantidadUsuarios
        );
    }

    public async Task<bool>
        CambiarEstadoAsync(
            long id,
            bool activa
        )
    {
        var cooperativa =
            await _context
                .Cooperativas
                .FirstOrDefaultAsync(
                    c =>
                        c.Id == id
                );

        if (cooperativa == null)
        {
            return false;
        }

        cooperativa.Activa =
            activa;

        await _context
            .SaveChangesAsync();

        return true;
    }

    public async Task<
        CooperativaDto?
    > ObtenerMiCooperativaAsync(
        long cooperativaId
    )
    {
        return await ObtenerPorIdAsync(
            cooperativaId
        );
    }

    public async Task<
        CooperativaDto?
    > ActualizarMiCooperativaAsync(
        long cooperativaId,
        ActualizarMiCooperativaRequest request
    )
    {
        var cooperativa =
            await _context
                .Cooperativas
                .FirstOrDefaultAsync(
                    c =>
                        c.Id ==
                        cooperativaId
                );

        if (cooperativa == null)
        {
            return null;
        }

        if (!cooperativa.Activa)
        {
            throw new InvalidOperationException(
                "La cooperativa está inactiva y no puede modificar su configuración."
            );
        }

        var nombre =
            request.Nombre.Trim();

        if (
            string.IsNullOrWhiteSpace(
                nombre
            )
        )
        {
            throw new InvalidOperationException(
                "El nombre de la cooperativa es obligatorio."
            );
        }

        var redesSociales =
            NormalizarJson(
                request.RedesSociales
            );

        var colorPrimario =
            NormalizarTexto(
                request.ColorPrimario
            );

        var colorSecundario =
            NormalizarTexto(
                request.ColorSecundario
            );

        ValidarColor(
            colorPrimario,
            "primario"
        );

        ValidarColor(
            colorSecundario,
            "secundario"
        );

        cooperativa.Nombre =
            nombre;

        cooperativa.Descripcion =
            NormalizarTexto(
                request.Descripcion
            );

        cooperativa.Telefono =
            NormalizarTexto(
                request.Telefono
            );

        cooperativa.Correo =
            NormalizarTexto(
                request.Correo
            )?.ToLowerInvariant();

        cooperativa.Direccion =
            NormalizarTexto(
                request.Direccion
            );

        cooperativa.LogoUrl =
            NormalizarTexto(
                request.LogoUrl
            );

        cooperativa.ColorPrimario =
            colorPrimario;

        cooperativa.ColorSecundario =
            colorSecundario;

        cooperativa.RedesSociales =
            redesSociales;

        cooperativa.InformacionSoporte =
            NormalizarTexto(
                request.InformacionSoporte
            );

        await _context
            .SaveChangesAsync();

        var cantidadUsuarios =
            await _context
                .Usuarios
                .CountAsync(
                    u =>
                        u.CooperativaId ==
                        cooperativa.Id
                );

        return Mapear(
            cooperativa,
            cantidadUsuarios
        );
    }

    private static CooperativaDto
        Mapear(
            Cooperativa cooperativa,
            int cantidadUsuarios
        )
    {
        return new CooperativaDto
        {
            Id =
                cooperativa.Id,

            Nombre =
                cooperativa.Nombre,

            Ruc =
                cooperativa.Ruc,

            Descripcion =
                cooperativa.Descripcion,

            Telefono =
                cooperativa.Telefono,

            Correo =
                cooperativa.Correo,

            Direccion =
                cooperativa.Direccion,

            LogoUrl =
                cooperativa.LogoUrl,

            ColorPrimario =
                cooperativa.ColorPrimario,

            ColorSecundario =
                cooperativa.ColorSecundario,

            RedesSociales =
                cooperativa.RedesSociales,

            InformacionSoporte =
                cooperativa.InformacionSoporte,

            Activa =
                cooperativa.Activa,

            CantidadUsuarios =
                cantidadUsuarios,

            CreadoEn =
                cooperativa.CreadoEn
        };
    }

    private static string?
        NormalizarTexto(
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

    private static string
        NormalizarJson(
            string? valor
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                valor
            )
        )
        {
            return "{}";
        }

        var texto =
            valor.Trim();

        try
        {
            using var documento =
                JsonDocument.Parse(
                    texto
                );

            if (
                documento.RootElement
                    .ValueKind !=
                JsonValueKind.Object
            )
            {
                throw new InvalidOperationException(
                    "Las redes sociales deben enviarse como un objeto JSON."
                );
            }

            return texto;
        }
        catch (JsonException)
        {
            throw new InvalidOperationException(
                "Las redes sociales contienen un JSON inválido."
            );
        }
    }

    private static void
        ValidarColor(
            string? color,
            string nombre
        )
    {
        if (color == null)
        {
            return;
        }

        if (
            color.Length != 7 ||
            color[0] != '#' ||
            !color
                .Skip(1)
                .All(
                    caracter =>
                        Uri.IsHexDigit(
                            caracter
                        )
                )
        )
        {
            throw new InvalidOperationException(
                $"El color {nombre} debe tener formato hexadecimal, por ejemplo #0D6EFD."
            );
        }
    }
}