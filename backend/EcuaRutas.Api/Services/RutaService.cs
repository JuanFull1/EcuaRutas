using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Rutas;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Services;

public class RutaService : IRutaService
{
    private readonly EcuaRutasDbContext _context;

    public RutaService(
        EcuaRutasDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<RutaDto>>
        ListarAsync(
            CancellationToken ct = default)
    {
        var rutas =
            await _context.Rutas
                .AsNoTracking()
                .OrderBy(
                    r => r.Nombre)
                .ThenBy(
                    r => r.Id)
                .ToListAsync(ct);

        return rutas
            .Select(Mapear)
            .ToList();
    }

    public async Task<RutaDto?>
        ObtenerAsync(
            long id,
            CancellationToken ct = default)
    {
        var ruta =
            await _context.Rutas
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    r => r.Id == id,
                    ct
                );

        return ruta is null
            ? null
            : Mapear(ruta);
    }

    public async Task<RutaDto>
        CrearAsync(
            CrearRutaDto request,
            CancellationToken ct = default)
    {
        Validator.ValidateObject(
            request,
            new ValidationContext(request),
            validateAllProperties: true
        );

        await using var transaction =
            await _context.Database
                .BeginTransactionAsync(ct);

        await ValidarLugaresAsync(
            request.OrigenLugarId,
            request.DestinoLugarId,
            true,
            ct
        );

        var ruta =
            new Ruta
            {
                Nombre =
                    request.Nombre.Trim(),

                OrigenLugarId =
                    request.OrigenLugarId,

                DestinoLugarId =
                    request.DestinoLugarId,

                TipoViaje =
                    request.TipoViaje,

                Activa =
                    true
            };

        _context.Rutas.Add(ruta);

        /*
         * Primero se guarda la ruta para obtener su ID.
         */
        await _context.SaveChangesAsync(ct);

        /*
         * Toda ruta debe contener también sus extremos
         * dentro de ruta_paradas.
         *
         * Esto es indispensable para:
         *
         * - búsqueda de viajes;
         * - tarifas;
         * - disponibilidad;
         * - ventas;
         * - control de ascenso y descenso.
         */

        var paradaOrigen =
            new RutaParada
            {
                RutaId =
                    ruta.Id,

                LugarId =
                    ruta.OrigenLugarId,

                Orden =
                    0,

                KmAcumulado =
                    0m,

                MinutosAcumulados =
                    0,

                PermiteAscenso =
                    true,

                PermiteDescenso =
                    false
            };

        var paradaDestino =
            new RutaParada
            {
                RutaId =
                    ruta.Id,

                LugarId =
                    ruta.DestinoLugarId,

                Orden =
                    1,

                KmAcumulado =
                    null,

                MinutosAcumulados =
                    null,

                PermiteAscenso =
                    false,

                PermiteDescenso =
                    true
            };

        _context.RutaParadas.AddRange(
            paradaOrigen,
            paradaDestino
        );

        await _context.SaveChangesAsync(ct);

        await transaction.CommitAsync(ct);

        return Mapear(ruta);
    }

    public async Task<RutaDto?>
        ActualizarAsync(
            long id,
            ActualizarRutaDto request,
            CancellationToken ct = default)
    {
        Validator.ValidateObject(
            request,
            new ValidationContext(request),
            validateAllProperties: true
        );

        await using var transaction =
            await _context.Database
                .BeginTransactionAsync(ct);

        var ruta =
            await _context.Rutas
                .FromSqlInterpolated(
                    $"SELECT * FROM rutas WHERE id = {id} FOR UPDATE"
                )
                .SingleOrDefaultAsync(ct);

        if (ruta is null)
        {
            return null;
        }

        await _context.Entry(ruta)
            .ReloadAsync(ct);

        var cambiaEstructura =
            ruta.OrigenLugarId !=
                request.OrigenLugarId
            ||
            ruta.DestinoLugarId !=
                request.DestinoLugarId
            ||
            ruta.TipoViaje !=
                request.TipoViaje;

        if (cambiaEstructura)
        {
            /*
             * Bloquear las paradas de la ruta para evitar
             * modificaciones concurrentes.
             */
           await _context.RutaParadas
    .FromSqlInterpolated(
        $"SELECT * FROM ruta_paradas WHERE ruta_id = {id} ORDER BY id FOR UPDATE"
    )
    .AsNoTracking()
    .ToListAsync(ct);

            var tieneFrecuencias =
                await _context.Frecuencias
                    .AnyAsync(
                        f => f.RutaId == id,
                        ct
                    );

            var tieneParadasReferenciadas =
                await _context.RutaParadas
                    .AnyAsync(
                        p =>
                            p.RutaId == id
                            &&
                            (
                                p.TarifasFrecuenciumOrigenRutaParada.Any()
                                ||
                                p.TarifasFrecuenciumDestinoRutaParada.Any()
                                ||
                                p.VentaAsientoOrigenRutaParada.Any()
                                ||
                                p.VentaAsientoDestinoRutaParada.Any()
                                ||
                                p.OcupacionesAsientoParadaAbordajes.Any()
                                ||
                                p.OcupacionesAsientoParadaLiberacions.Any()
                                ||
                                p.ExtensionesBoletoDestinoAnteriors.Any()
                                ||
                                p.ExtensionesBoletoDestinoNuevos.Any()
                            ),
                        ct
                    );

            if (
                tieneFrecuencias ||
                tieneParadasReferenciadas
            )
            {
                throw new ConflictoException(
                    "No se pueden cambiar el origen, " +
                    "destino o tipo de una ruta con " +
                    "referencias operativas."
                );
            }

            /*
             * Si todavía no existe actividad operativa,
             * podemos reconstruir correctamente el
             * recorrido de la ruta.
             */

            var paradasActuales =
                await _context.RutaParadas
                    .Where(
                        p => p.RutaId == id)
                    .OrderBy(
                        p => p.Orden)
                    .ThenBy(
                        p => p.Id)
                    .ToListAsync(ct);

            /*
             * Conservar únicamente lugares intermedios.
             * Los extremos se vuelven a crear de acuerdo
             * con los nuevos origen y destino.
             */
            var lugaresIntermedios =
                request.TipoViaje == "CON_PARADAS"
                    ? paradasActuales
                        .Where(
                            p =>
                                p.LugarId !=
                                    ruta.OrigenLugarId
                                &&
                                p.LugarId !=
                                    ruta.DestinoLugarId
                                &&
                                p.LugarId !=
                                    request.OrigenLugarId
                                &&
                                p.LugarId !=
                                    request.DestinoLugarId
                        )
                        .Select(
                            p => new
                            {
                                p.LugarId,
                                p.KmAcumulado,
                                p.MinutosAcumulados,
                                p.PermiteAscenso,
                                p.PermiteDescenso
                            }
                        )
                        .ToList()
                    : [];

            _context.RutaParadas
                .RemoveRange(
                    paradasActuales
                );

            /*
             * Es necesario ejecutar la eliminación antes
             * de volver a insertar porque existen claves
             * únicas por ruta/lugar y ruta/orden.
             */
            await _context.SaveChangesAsync(ct);

            ruta.Nombre =
                request.Nombre.Trim();

            ruta.OrigenLugarId =
                request.OrigenLugarId;

            ruta.DestinoLugarId =
                request.DestinoLugarId;

            ruta.TipoViaje =
                request.TipoViaje;

            ruta.Activa =
                request.Activa;

            await ValidarLugaresAsync(
                request.OrigenLugarId,
                request.DestinoLugarId,
                request.Activa,
                ct
            );

            var nuevasParadas =
                new List<RutaParada>();

            nuevasParadas.Add(
                new RutaParada
                {
                    RutaId =
                        ruta.Id,

                    LugarId =
                        request.OrigenLugarId,

                    Orden =
                        0,

                    KmAcumulado =
                        0m,

                    MinutosAcumulados =
                        0,

                    PermiteAscenso =
                        true,

                    PermiteDescenso =
                        false
                }
            );

            var orden =
                1;

            foreach (
                var intermedia
                in lugaresIntermedios)
            {
                nuevasParadas.Add(
                    new RutaParada
                    {
                        RutaId =
                            ruta.Id,

                        LugarId =
                            intermedia.LugarId,

                        Orden =
                            orden++,

                        KmAcumulado =
                            intermedia.KmAcumulado,

                        MinutosAcumulados =
                            intermedia.MinutosAcumulados,

                        PermiteAscenso =
                            intermedia.PermiteAscenso,

                        PermiteDescenso =
                            intermedia.PermiteDescenso
                    }
                );
            }

            nuevasParadas.Add(
                new RutaParada
                {
                    RutaId =
                        ruta.Id,

                    LugarId =
                        request.DestinoLugarId,

                    Orden =
                        orden,

                    KmAcumulado =
                        null,

                    MinutosAcumulados =
                        null,

                    PermiteAscenso =
                        false,

                    PermiteDescenso =
                        true
                }
            );

            _context.RutaParadas
                .AddRange(
                    nuevasParadas
                );

            await _context.SaveChangesAsync(ct);

            await transaction.CommitAsync(ct);

            return Mapear(ruta);
        }

        /*
         * Edición que no modifica la estructura.
         */
        var exigirActivos =
            request.Activa &&
            (
                !ruta.Activa
                ||
                ruta.OrigenLugarId !=
                    request.OrigenLugarId
                ||
                ruta.DestinoLugarId !=
                    request.DestinoLugarId
            );

        await ValidarLugaresAsync(
            request.OrigenLugarId,
            request.DestinoLugarId,
            exigirActivos,
            ct
        );

        ruta.Nombre =
            request.Nombre.Trim();

        ruta.OrigenLugarId =
            request.OrigenLugarId;

        ruta.DestinoLugarId =
            request.DestinoLugarId;

        ruta.TipoViaje =
            request.TipoViaje;

        ruta.Activa =
            request.Activa;

        await _context.SaveChangesAsync(ct);

        await transaction.CommitAsync(ct);

        return Mapear(ruta);
    }

    public async Task<bool>
        DarDeBajaAsync(
            long id,
            CancellationToken ct = default)
    {
        await using var transaction =
            await _context.Database
                .BeginTransactionAsync(ct);

        var ruta =
            await _context.Rutas
                .FromSqlInterpolated(
                    $"SELECT * FROM rutas WHERE id = {id} FOR UPDATE"
                )
                .SingleOrDefaultAsync(ct);

        if (ruta is null)
        {
            return false;
        }

        await _context.Entry(ruta)
            .ReloadAsync(ct);

        ruta.Activa =
            false;

        await _context.SaveChangesAsync(ct);

        await transaction.CommitAsync(ct);

        return true;
    }

    private async Task
        ValidarLugaresAsync(
            long origenId,
            long destinoId,
            bool exigirActivos,
            CancellationToken ct)
    {
       var lugares =
    await _context.Lugares
        .FromSqlInterpolated(
            $"SELECT * FROM lugares WHERE id = {origenId} OR id = {destinoId} ORDER BY id FOR SHARE"
        )
        .AsNoTracking()
        .ToListAsync(ct);

        if (
            !lugares.Any(
                l => l.Id == origenId)
        )
        {
            throw new RecursoNoEncontradoException(
                $"No existe el lugar de origen con id {origenId}."
            );
        }

        if (
            !lugares.Any(
                l => l.Id == destinoId)
        )
        {
            throw new RecursoNoEncontradoException(
                $"No existe el lugar de destino con id {destinoId}."
            );
        }

        if (
            exigirActivos &&
            lugares.Any(
                l => !l.Activo)
        )
        {
            throw new ConflictoException(
                "El origen y el destino deben estar activos " +
                "para habilitar la ruta."
            );
        }
    }

    private static RutaDto
        Mapear(
            Ruta ruta)
        => new()
        {
            Id =
                ruta.Id,

            Nombre =
                ruta.Nombre,

            OrigenLugarId =
                ruta.OrigenLugarId,

            DestinoLugarId =
                ruta.DestinoLugarId,

            TipoViaje =
                ruta.TipoViaje,

            Activa =
                ruta.Activa
        };
}
