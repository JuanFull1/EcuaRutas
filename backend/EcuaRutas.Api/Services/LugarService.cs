using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Rutas;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace EcuaRutas.Api.Services;

public class LugarService : ILugarService
{
    private readonly EcuaRutasDbContext _context;

    public LugarService(EcuaRutasDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<LugarDto>> ListarAsync(CancellationToken ct = default)
    {
        var lugares = await _context.Lugares
            .AsNoTracking()
            .OrderBy(l => l.Nombre)
            .ThenBy(l => l.Id)
            .ToListAsync(ct);

        return lugares.Select(Mapear).ToList();
    }

    public async Task<LugarDto?> ObtenerAsync(long id, CancellationToken ct = default)
    {
        var lugar = await _context.Lugares
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == id, ct);

        return lugar is null ? null : Mapear(lugar);
    }

    public async Task<LugarDto> CrearAsync(CrearLugarDto request, CancellationToken ct = default)
    {
        Validar(request, request.Ubicacion);

        var lugar = new Lugare
        {
            Nombre = request.Nombre,
            Provincia = request.Provincia,
            Canton = request.Canton,
            Tipo = request.Tipo,
            Ubicacion = MapearUbicacion(request.Ubicacion),
            Activo = true
        };

        _context.Lugares.Add(lugar);
        await _context.SaveChangesAsync(ct);

        return Mapear(lugar);
    }

    public async Task<LugarDto?> ActualizarAsync(
        long id, ActualizarLugarDto request, CancellationToken ct = default)
    {
        Validar(request, request.Ubicacion);

        var lugar = await _context.Lugares.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lugar is null)
            return null;

        lugar.Nombre = request.Nombre;
        lugar.Provincia = request.Provincia;
        lugar.Canton = request.Canton;
        lugar.Tipo = request.Tipo;
        lugar.Ubicacion = MapearUbicacion(request.Ubicacion);
        lugar.Activo = request.Activo;

        await _context.SaveChangesAsync(ct);

        return Mapear(lugar);
    }

    public async Task<bool> DarDeBajaAsync(long id, CancellationToken ct = default)
    {
        var lugar = await _context.Lugares.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lugar is null)
            return false;

        lugar.Activo = false;
        await _context.SaveChangesAsync(ct);

        return true;
    }

    // DataAnnotations no valida objetos anidados automaticamente al invocarse desde el servicio.
    // ValidationException distingue entradas invalidas de errores tecnicos de persistencia.
    private static void Validar(object request, CoordenadasDto? ubicacion)
    {
        Validator.ValidateObject(request, new ValidationContext(request), validateAllProperties: true);

        if (ubicacion is not null)
            Validator.ValidateObject(ubicacion, new ValidationContext(ubicacion), validateAllProperties: true);
    }

    private static Point? MapearUbicacion(CoordenadasDto? ubicacion) =>
        ubicacion is null
            ? null
            : new Point(ubicacion.Longitud, ubicacion.Latitud) { SRID = 4326 };

    private static LugarDto Mapear(Lugare lugar) => new()
    {
        Id = lugar.Id,
        Nombre = lugar.Nombre,
        Provincia = lugar.Provincia,
        Canton = lugar.Canton,
        Tipo = lugar.Tipo,
        Ubicacion = lugar.Ubicacion is null
            ? null
            : new CoordenadasDto
            {
                Longitud = lugar.Ubicacion.X,
                Latitud = lugar.Ubicacion.Y
            },
        Activo = lugar.Activo
    };
}
