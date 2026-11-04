using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Data.Common;
using System.Text.RegularExpressions;
using EcuaRutas.Api.Data;
using EcuaRutas.Api.Tests.Controllers;
using EcuaRutas.Api.DTOs.Tarifas;
using EcuaRutas.Api.Models;
using EcuaRutas.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;
using Xunit;

namespace EcuaRutas.Api.Tests.Services;

// Pruebas unitarias con consultas Npgsql interceptadas, sin conexión real.
// Pendiente en PostgreSQL aislado: FK, numeric (incluido su redondeo nativo),
// CHECK, unicidad concurrente, bloqueos compartidos, deadlocks y rollback real.
public class TarifaFrecuenciaServiceTests
{

    [Fact]
    public async Task CooperativaConsultaSoloTarifasDeSusFrecuencias()
    {
        await using var db = new ContextoSimulado(); db.Filas.AddRange([Fila(1), Fila(2, frecuencia: 12)]);
        var servicio = new TarifaFrecuenciaService(db);
        await AlcanceCatalogosTests.EjecutarAsync(async () =>
        {
            Assert.Equal(1, Assert.Single(await servicio.ListarAsync()).Id);
            Assert.Single(await servicio.ListarPorFrecuenciaAsync(11));
            await Assert.ThrowsAsync<RecursoNoEncontradoException>(() => servicio.ListarPorFrecuenciaAsync(12));
            Assert.NotNull(await servicio.ObtenerAsync(1)); Assert.Null(await servicio.ObtenerAsync(2));
            Assert.Contains(db.Sql, sql => sql.Contains("JOIN") && sql.Contains("cooperativa_id") && sql.Contains("propia"));
        });
        await AlcanceCatalogosTests.EjecutarAsync(async () => Assert.Equal(2, (await servicio.ListarAsync()).Count), null, "ADMIN");
    }

    [Fact]
    public async Task CooperativaCreaEditaYDesactivaTarifaPropia()
    {
        await using var db = new ContextoSimulado(); var servicio = new TarifaFrecuenciaService(db);
        await AlcanceCatalogosTests.EjecutarAsync(async () =>
        {
            var creada = await servicio.CrearAsync(11, Crear());
            Assert.NotNull(await servicio.ActualizarAsync(creada.Id, Editar()));
            Assert.True(await servicio.DarDeBajaAsync(creada.Id));
        });
        Assert.Equal(3, db.Guardados);
        Assert.All(db.TiposGuardados, t => Assert.Equal(typeof(TarifasFrecuencium), t));
    }

    [Fact]
    public async Task CooperativaNoCreaEditaNiDesactivaTarifaAjena()
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(2, frecuencia: 12));
        var servicio = new TarifaFrecuenciaService(db);
        await AlcanceCatalogosTests.EjecutarAsync(async () =>
        {
            await Assert.ThrowsAsync<RecursoNoEncontradoException>(() => servicio.CrearAsync(12, Crear()));
            Assert.Null(await servicio.ActualizarAsync(2, Editar()));
            Assert.False(await servicio.DarDeBajaAsync(2));
        });
        Assert.Equal(0, db.Guardados); Assert.True(Assert.Single(db.Filas).Activa);
    }

    [Theory]
    [InlineData("precio")]
    [InlineData("decimales")]
    [InlineData("ruta")]
    [InlineData("orden")]
    public async Task CooperativaConservaValidacionesDePrecioYTramo(string caso)
    {
        await using var db = new ContextoSimulado(); var dto = Crear();
        if (caso == "precio") dto.PrecioBase = -1;
        if (caso == "decimales") dto.PrecioBase = 1.001m;
        if (caso == "ruta") db.Paradas.Single(p => p.Id == 10).RutaId = 99;
        if (caso == "orden") db.Paradas.Single(p => p.Id == 10).Orden = 0;
        await AlcanceCatalogosTests.EjecutarAsync(async () =>
        {
            if (caso is "precio" or "decimales")
                await Assert.ThrowsAsync<ValidationException>(() => new TarifaFrecuenciaService(db).CrearAsync(11, dto));
            else await Assert.ThrowsAsync<ConflictoException>(() => new TarifaFrecuenciaService(db).CrearAsync(11, dto));
        });
        Assert.Equal(0, db.Guardados);
    }

    [Fact]
    public async Task ConsultasProyectanOrdenanFiltranEIncluyenInactivasSinRastrear()
    {
        await using var db = new ContextoSimulado();
        db.Filas.AddRange([Fila(3, frecuencia: 12), Fila(2, activa: false), Fila(1)]);
        var servicio = new TarifaFrecuenciaService(db);
        var lista = await servicio.ListarAsync();
        Assert.Equal(new long[] { 1, 2, 3 }, lista.Select(t => t.Id));
        Assert.False(lista[1].Activa);
        Assert.Equal(11, lista[0].FrecuenciaId);
        Assert.Equal(90, lista[0].OrigenRutaParadaId);
        Assert.Equal(10, lista[0].DestinoRutaParadaId);
        Assert.Equal(5.25m, lista[0].PrecioBase);
        Assert.Equal(new long[] { 1, 2 }, (await servicio.ListarPorFrecuenciaAsync(11)).Select(t => t.Id));
        Assert.False((await servicio.ObtenerAsync(2))!.Activa);
        Assert.Null(await servicio.ObtenerAsync(long.MaxValue));
        Assert.Empty(await servicio.ListarPorFrecuenciaAsync(12 + 1));
        await Assert.ThrowsAsync<RecursoNoEncontradoException>(() => servicio.ListarPorFrecuenciaAsync(999));
        Assert.Empty(db.ChangeTracker.Entries());
        Assert.Contains("ORDER BY", db.Sql[0]);
        Assert.All(db.Sql, sql => Assert.DoesNotContain("JOIN", sql));
    }

    [Theory]
    [InlineData("0")]
    [InlineData("5.25")]
    [InlineData("99999999.99")]
    public async Task AltaAceptaLimitesYOrdenRealAunqueIdsEstanInvertidos(string precio)
    {
        await using var db = new ContextoSimulado(); var dto = Crear();
        dto.PrecioBase = decimal.Parse(precio, System.Globalization.CultureInfo.InvariantCulture);
        var resultado = await new TarifaFrecuenciaService(db).CrearAsync(11, dto);
        Assert.True(resultado.Activa);
        Assert.True(resultado.Id > 0);
        Assert.Equal(dto.PrecioBase, resultado.PrecioBase);
        Assert.Single(db.Filas);
        Assert.Equal(1, db.Commits);
        Assert.Equal(3, db.Sql.Count(s => s.Contains("FOR SHARE")));
    }

    [Theory]
    [InlineData("frecuencia")]
    [InlineData("origen")]
    [InlineData("destino")]
    public async Task ReferenciasInexistentesSeDistinguenEnAltaYEdicion(string referencia)
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(1));
        if (referencia == "frecuencia") db.FrecuenciasResueltas.Clear();
        else db.Paradas.RemoveAll(p => p.Id == (referencia == "origen" ? 90 : 10));
        var servicio = new TarifaFrecuenciaService(db);
        var error = await Assert.ThrowsAsync<RecursoNoEncontradoException>(() => servicio.CrearAsync(11, Crear()));
        Assert.Contains(referencia, error.Message);
        await Assert.ThrowsAsync<RecursoNoEncontradoException>(() => servicio.ActualizarAsync(1, Editar()));
        Assert.Equal(0, db.Guardados);
    }

    [Theory]
    [InlineData("origen")]
    [InlineData("destino")]
    [InlineData("orden")]
    public async Task RechazaOtraRutaYOrdenInvalidoEnAltaYEdicion(string defecto)
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(1));
        if (defecto == "orden") db.Paradas.Single(p => p.Id == 90).Orden = 3;
        else db.Paradas.Single(p => p.Id == (defecto == "origen" ? 90 : 10)).RutaId = 99;
        var servicio = new TarifaFrecuenciaService(db);
        var error = await Assert.ThrowsAsync<ConflictoException>(() => servicio.CrearAsync(11, Crear()));
        Assert.Contains(defecto == "orden" ? "orden" : "ruta", error.Message);
        await Assert.ThrowsAsync<ConflictoException>(() => servicio.ActualizarAsync(1, Editar()));
        Assert.Equal(0, db.Guardados);
    }

    [Fact]
    public async Task AltaYReactivacionExigenFrecuenciaActivaPeroBajaYEdicionInactivaSonPosibles()
    {
        await using var db = new ContextoSimulado(); db.FrecuenciasResueltas[0].Activa = false;
        var servicio = new TarifaFrecuenciaService(db);
        await Assert.ThrowsAsync<ConflictoException>(() => servicio.CrearAsync(11, Crear()));
        db.Filas.Add(Fila(1, activa: false)); var dto = Editar(); dto.Activa = true;
        await Assert.ThrowsAsync<ConflictoException>(() => servicio.ActualizarAsync(1, dto));
        dto.Activa = false; dto.PrecioBase = 8m;
        Assert.False((await servicio.ActualizarAsync(1, dto))!.Activa);
        Assert.True(await servicio.DarDeBajaAsync(1));
    }

    [Theory]
    [InlineData("negativo")]
    [InlineData("maximo")]
    [InlineData("decimales")]
    [InlineData("omitido")]
    [InlineData("origen")]
    [InlineData("destino")]
    [InlineData("iguales")]
    public async Task ValidaDtoOriginalSinRedondearNiConsultar(string defecto)
    {
        await using var db = new ContextoSimulado(); var crear = Crear(); var editar = Editar();
        switch (defecto)
        {
            case "negativo": crear.PrecioBase = editar.PrecioBase = -0.01m; break;
            case "maximo": crear.PrecioBase = editar.PrecioBase = 100000000m; break;
            case "decimales": crear.PrecioBase = editar.PrecioBase = 1.001m; break;
            case "omitido": crear.PrecioBase = editar.PrecioBase = null; break;
            case "origen": crear.OrigenRutaParadaId = editar.OrigenRutaParadaId = 0; break;
            case "destino": crear.DestinoRutaParadaId = editar.DestinoRutaParadaId = -1; break;
            case "iguales": crear.DestinoRutaParadaId = editar.DestinoRutaParadaId = 90; break;
        }
        var servicio = new TarifaFrecuenciaService(db);
        await Assert.ThrowsAsync<ValidationException>(() => servicio.CrearAsync(11, crear));
        await Assert.ThrowsAsync<ValidationException>(() => servicio.ActualizarAsync(1, editar));
        Assert.Empty(db.Sql);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task DuplicadosIncluyenInactivosYExcluyenLaPropiaTarifa(bool activa)
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(1, activa: activa));
        var servicio = new TarifaFrecuenciaService(db);
        await Assert.ThrowsAsync<ConflictoException>(() => servicio.CrearAsync(11, Crear()));
        db.Filas.Add(Fila(2, destino: 20));
        await Assert.ThrowsAsync<ConflictoException>(() => servicio.ActualizarAsync(2, Editar()));
        Assert.Equal(0, db.Guardados);
        Assert.NotNull(await servicio.ActualizarAsync(1, Editar()));
    }

    [Theory]
    [InlineData("origen")]
    [InlineData("destino")]
    [InlineData("precio")]
    public async Task EdicionCambiaTramoOPrecioYConservaFrecuenciaYFalse(string cambio)
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(1)); var dto = Editar();
        if (cambio == "origen") dto.OrigenRutaParadaId = 80;
        if (cambio == "destino") dto.DestinoRutaParadaId = 20;
        if (cambio == "precio") dto.PrecioBase = 12.34m;
        var resultado = await new TarifaFrecuenciaService(db).ActualizarAsync(1, dto);
        Assert.NotNull(resultado);
        Assert.Equal(11, resultado.FrecuenciaId);
        Assert.False(resultado.Activa);
        Assert.Equal(dto.OrigenRutaParadaId, resultado.OrigenRutaParadaId);
        Assert.Equal(dto.DestinoRutaParadaId, resultado.DestinoRutaParadaId);
        Assert.Equal(dto.PrecioBase, resultado.PrecioBase);
        Assert.Equal(1, db.Commits);
    }

    [Fact]
    public async Task EdicionYBajaConservanVentaYBoletoConImportesPropios()
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(1));
        var venta = new VentaAsiento { Id = 100, ViajeId = 30, OrigenRutaParadaId = 90,
            DestinoRutaParadaId = 10, PrecioBase = 5.25m, PrecioFinal = 6m };
        var boleto = new Boleto { Id = 200, VentaAsientoId = 100, VentaAsiento = venta };
        db.Attach(venta); db.Attach(boleto);
        var dto = Editar(); dto.PrecioBase = 8m; dto.DestinoRutaParadaId = 20;
        var servicio = new TarifaFrecuenciaService(db);
        Assert.Equal(8m, (await servicio.ActualizarAsync(1, dto))!.PrecioBase);
        Assert.True(await servicio.DarDeBajaAsync(1));
        Assert.True(await servicio.DarDeBajaAsync(1));
        Assert.False(Assert.Single(db.Filas).Activa);
        Assert.Equal(5.25m, venta.PrecioBase); Assert.Equal(6m, venta.PrecioFinal);
        Assert.Equal(10, venta.DestinoRutaParadaId); Assert.Equal(100, boleto.VentaAsientoId);
        Assert.Equal(EntityState.Unchanged, db.Entry(venta).State);
        Assert.Equal(EntityState.Unchanged, db.Entry(boleto).State);
        Assert.All(db.TiposGuardados, tipo => Assert.Equal(typeof(TarifasFrecuencium), tipo));
        Assert.True(db.FrecuenciasResueltas[0].Activa);
        Assert.Equal(4, db.Paradas.Count);
        Assert.DoesNotContain(db.Sql, s => s.Contains("DELETE"));
    }

    [Fact]
    public async Task EdicionYBajaInexistentesDevuelvenNullYFalse()
    {
        await using var db = new ContextoSimulado(); var servicio = new TarifaFrecuenciaService(db);
        Assert.Null(await servicio.ActualizarAsync(999, Editar()));
        Assert.False(await servicio.DarDeBajaAsync(999));
        Assert.Equal(0, db.Guardados); Assert.Equal(0, db.Commits);
    }

    [Fact]
    public async Task RecargaEntidadPreviamenteRastreadaAntesDeEditar()
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(1, frecuencia: 12));
        db.Attach(Fila(1));
        Assert.Equal(12, (await new TarifaFrecuenciaService(db).ActualizarAsync(1, Editar()))!.FrecuenciaId);
    }

    [Theory]
    [InlineData("23505", "tarifas_frecuencia", "tarifas_frecuencia_frecuencia_id_origen_ruta_parada_id_dest_key", true)]
    [InlineData("23505", "otra_tabla", "tarifas_frecuencia_frecuencia_id_origen_ruta_parada_id_dest_key", false)]
    [InlineData("23505", "tarifas_frecuencia", "otra_restriccion", false)]
    [InlineData("23503", "tarifas_frecuencia", "fk", false)]
    [InlineData("23514", "tarifas_frecuencia", "check", false)]
    public async Task TraduceSoloDuplicidadEspecificaSinConfirmarTransaccion(string estado, string tabla, string restriccion, bool conflicto)
    {
        await using var db = new ContextoSimulado();
        db.ErrorGuardado = new DbUpdateException("simulado", new PostgresException("simulado", "ERROR", "ERROR", estado,
            tableName: tabla, constraintName: restriccion));
        var servicio = new TarifaFrecuenciaService(db);
        if (conflicto) await Assert.ThrowsAsync<ConflictoException>(() => servicio.CrearAsync(11, Crear()));
        else Assert.Same(db.ErrorGuardado, await Assert.ThrowsAsync<DbUpdateException>(() => servicio.CrearAsync(11, Crear())));
        Assert.Empty(db.Filas); Assert.Equal(0, db.Commits); Assert.Equal(1, db.TransaccionesDispuestas);
    }

    [Fact]
    public async Task PropagaErrorTecnicoSinConvertirloEnConflicto()
    {
        await using var db = new ContextoSimulado(); db.ErrorGuardado = new InvalidOperationException("simulado");
        Assert.Same(db.ErrorGuardado, await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new TarifaFrecuenciaService(db).CrearAsync(11, Crear())));
    }

    [Theory]
    [InlineData(0L)]
    [InlineData(-1L)]
    public async Task IdentificadoresInvalidosNoConsultan(long id)
    {
        await using var db = new ContextoSimulado(); var servicio = new TarifaFrecuenciaService(db);
        await Assert.ThrowsAsync<ValidationException>(() => servicio.ObtenerAsync(id));
        await Assert.ThrowsAsync<ValidationException>(() => servicio.ListarPorFrecuenciaAsync(id));
        await Assert.ThrowsAsync<ValidationException>(() => servicio.CrearAsync(id, Crear()));
        await Assert.ThrowsAsync<ValidationException>(() => servicio.ActualizarAsync(id, Editar()));
        await Assert.ThrowsAsync<ValidationException>(() => servicio.DarDeBajaAsync(id));
        Assert.Empty(db.Sql);
    }

    [Fact]
    public async Task CancelacionInicialSeRespetaEnTodasLasOperaciones()
    {
        await using var db = new ContextoSimulado(); var servicio = new TarifaFrecuenciaService(db);
        using var fuente = new CancellationTokenSource(); fuente.Cancel(); var ct = fuente.Token;
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.ListarAsync(ct));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.ObtenerAsync(1, ct));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.ListarPorFrecuenciaAsync(11, ct));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.CrearAsync(11, Crear(), ct));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.ActualizarAsync(1, Editar(), ct));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.DarDeBajaAsync(1, ct));
        Assert.Empty(db.Sql);
    }

    [Fact]
    public async Task TokenSePropagaYCancelacionDuranteConsultaImpideGuardado()
    {
        await using var db = new ContextoSimulado(); using var fuente = new CancellationTokenSource();
        var servicio = new TarifaFrecuenciaService(db);
        await servicio.CrearAsync(11, Crear(), fuente.Token);
        Assert.All(db.Tokens, token => Assert.Equal(fuente.Token, token));
        Assert.True(db.Tokens.Count >= 6);
        db.AlConsultar = () => fuente.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.ActualizarAsync(900, Editar(), fuente.Token));
        Assert.Equal(1, db.Guardados); Assert.Equal(1, db.Commits);
    }

    private static TarifasFrecuencium Fila(long id, bool activa = true, long frecuencia = 11, long destino = 10) => new()
    { Id = id, FrecuenciaId = frecuencia, OrigenRutaParadaId = 90, DestinoRutaParadaId = destino, PrecioBase = 5.25m, Activa = activa };
    private static CrearTarifaFrecuenciaDto Crear() => new() { OrigenRutaParadaId = 90, DestinoRutaParadaId = 10, PrecioBase = 5.25m };
    private static ActualizarTarifaFrecuenciaDto Editar() => new() { OrigenRutaParadaId = 90, DestinoRutaParadaId = 10, PrecioBase = 5.25m, Activa = false };

    private sealed class ContextoSimulado : EcuaRutasDbContext
    {
        public readonly List<TarifasFrecuencium> Filas = [];
        public readonly List<Frecuencia> FrecuenciasResueltas =
        [new() { Id = 11, CooperativaId = 11, RutaId = 22, Activa = true }, new() { Id = 12, CooperativaId = 12, RutaId = 22, Activa = true }, new() { Id = 13, CooperativaId = 11, RutaId = 22, Activa = false }];
        public readonly List<RutaParada> Paradas =
        [new() { Id = 90, RutaId = 22, Orden = 0 }, new() { Id = 80, RutaId = 22, Orden = 1 },
         new() { Id = 10, RutaId = 22, Orden = 2 }, new() { Id = 20, RutaId = 22, Orden = 3 }];
        public readonly List<string> Sql = [];
        public readonly List<CancellationToken> Tokens = [];
        public readonly List<Type> TiposGuardados = [];
        public Exception? ErrorGuardado;
        public Action? AlConsultar;
        public int Guardados, Commits, TransaccionesDispuestas;
        private readonly DatabaseFacade fachada;
        public ContextoSimulado() : base(new DbContextOptionsBuilder<EcuaRutasDbContext>()
            .UseNpgsql("Host=127.0.0.1;Port=1;Database=sin_conexion;Username=prueba", o => o.UseNetTopologySuite())
            .AddInterceptors(new ConexionSuprimida(), new ConsultasSimuladas()).Options)
        { fachada = new FachadaSimulada(this); }
        public override DatabaseFacade Database => fachada;
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested(); Tokens.Add(cancellationToken);
            if (ErrorGuardado is not null) return Task.FromException<int>(ErrorGuardado);
            Guardados++;
            foreach (var entry in ChangeTracker.Entries().Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted).ToList())
            {
                TiposGuardados.Add(entry.Entity.GetType());
                Assert.NotEqual(EntityState.Deleted, entry.State);
                var tarifa = Assert.IsType<TarifasFrecuencium>(entry.Entity);
                if (entry.State == EntityState.Added)
                {
                    entry.Property(nameof(tarifa.Id)).CurrentValue = 900L + Filas.Count;
                    entry.Property(nameof(tarifa.Id)).IsTemporary = false;
                }
                Filas.RemoveAll(t => t.Id == tarifa.Id);
                Filas.Add(new() { Id = tarifa.Id, FrecuenciaId = tarifa.FrecuenciaId, OrigenRutaParadaId = tarifa.OrigenRutaParadaId,
                    DestinoRutaParadaId = tarifa.DestinoRutaParadaId, PrecioBase = tarifa.PrecioBase, Activa = tarifa.Activa });
            }
            ChangeTracker.AcceptAllChanges(); return Task.FromResult(1);
        }
    }

    private sealed class ConexionSuprimida : DbConnectionInterceptor
    {
        public override ValueTask<InterceptionResult> ConnectionOpeningAsync(DbConnection connection, ConnectionEventData eventData,
            InterceptionResult result, CancellationToken cancellationToken = default)
        { cancellationToken.ThrowIfCancellationRequested(); return ValueTask.FromResult(InterceptionResult.Suppress()); }
    }

    private sealed class ConsultasSimuladas : DbCommandInterceptor
    {
        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData,
            InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested(); var db = (ContextoSimulado)eventData.Context!;
            var sql = command.CommandText; db.Sql.Add(sql); db.Tokens.Add(cancellationToken);
            db.AlConsultar?.Invoke(); cancellationToken.ThrowIfCancellationRequested();
            var parametros = command.Parameters.Cast<DbParameter>().ToArray();
            var id = parametros.FirstOrDefault(p => p.Value is long && !p.ParameterName.Contains("propia", StringComparison.OrdinalIgnoreCase))?.Value as long?;
            var propia = parametros.FirstOrDefault(p => p.ParameterName.Contains("propia", StringComparison.OrdinalIgnoreCase))?.Value as long?;
            long? Parametro(string nombre) => parametros.FirstOrDefault(p => p.ParameterName.Contains(nombre, StringComparison.OrdinalIgnoreCase))?.Value as long?;
            DataTable tabla = new();
            if (sql.StartsWith("SELECT EXISTS", StringComparison.Ordinal))
            {
                bool existe;
                if (sql.Contains("FROM frecuencias")) existe = db.FrecuenciasResueltas.Any(f => f.Id == id && (!propia.HasValue || f.CooperativaId == propia));
                else if (sql.Contains("FROM tarifas_frecuencia"))
                    existe = db.Filas.Any(t => t.FrecuenciaId == Parametro("FrecuenciaId") && t.OrigenRutaParadaId == Parametro("OrigenRutaParadaId")
                        && t.DestinoRutaParadaId == Parametro("DestinoRutaParadaId") && t.Id != Parametro("tarifa_Id"));
                else throw new InvalidOperationException(sql);
                tabla.Columns.Add("existe", typeof(bool)); tabla.Rows.Add(existe);
            }
            else
            {
                IEnumerable<Dictionary<string, object?>> filas;
                if (sql.Contains("FROM frecuencias")) filas = db.FrecuenciasResueltas.Where(f => f.Id == id).Select(f => new Dictionary<string, object?>
                    { ["id"] = f.Id, ["cooperativa_id"] = f.CooperativaId, ["ruta_id"] = f.RutaId, ["activa"] = f.Activa });
                else if (sql.Contains("FROM ruta_paradas")) filas = db.Paradas.Where(p => p.Id == id).Select(p => new Dictionary<string, object?>
                    { ["id"] = p.Id, ["ruta_id"] = p.RutaId, ["orden"] = p.Orden });
                else if (sql.Contains("FROM tarifas_frecuencia"))
                {
                    var frecuencia = Parametro("frecuenciaId");
                    var consulta = db.Filas.Where(t => (frecuencia.HasValue ? t.FrecuenciaId == frecuencia : !id.HasValue || t.Id == id)
                        && (!propia.HasValue || db.FrecuenciasResueltas.Any(f => f.Id == t.FrecuenciaId && f.CooperativaId == propia)));
                    filas = consulta.OrderBy(t => t.FrecuenciaId).ThenBy(t => t.OrigenRutaParadaId).ThenBy(t => t.DestinoRutaParadaId).ThenBy(t => t.Id)
                        .Select(t => new Dictionary<string, object?> { ["id"] = t.Id, ["frecuencia_id"] = t.FrecuenciaId,
                            ["origen_ruta_parada_id"] = t.OrigenRutaParadaId, ["destino_ruta_parada_id"] = t.DestinoRutaParadaId,
                            ["precio_base"] = t.PrecioBase, ["activa"] = t.Activa });
                }
                else throw new InvalidOperationException(sql);
                var cabecera = sql[..sql.IndexOf("FROM", StringComparison.Ordinal)];
                var columnas = Regex.Matches(cabecera, @"\b\w+\.(\w+)").Select(m => m.Groups[1].Value).ToArray();
                Assert.NotEmpty(columnas);
                foreach (var columna in columnas) tabla.Columns.Add(columna, columna switch
                    { "activa" => typeof(bool), "orden" => typeof(int), "precio_base" => typeof(decimal), _ => typeof(long) });
                foreach (var fila in filas) tabla.Rows.Add(columnas.Select(columna => fila[columna] ?? DBNull.Value).ToArray());
            }
            return ValueTask.FromResult(InterceptionResult<DbDataReader>.SuppressWithResult(tabla.CreateDataReader()));
        }
    }

    private sealed class FachadaSimulada(ContextoSimulado db) : DatabaseFacade(db)
    {
        public override Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
        { cancellationToken.ThrowIfCancellationRequested(); db.Tokens.Add(cancellationToken); return Task.FromResult<IDbContextTransaction>(new TransaccionSimulada(db)); }
    }
    private sealed class TransaccionSimulada(ContextoSimulado db) : IDbContextTransaction
    {
        public Guid TransactionId { get; } = Guid.NewGuid();
        public void Commit() => db.Commits++;
        public Task CommitAsync(CancellationToken cancellationToken = default)
        { cancellationToken.ThrowIfCancellationRequested(); db.Tokens.Add(cancellationToken); Commit(); return Task.CompletedTask; }
        public void Rollback() { }
        public Task RollbackAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public void Dispose() => db.TransaccionesDispuestas++;
        public ValueTask DisposeAsync() { Dispose(); return ValueTask.CompletedTask; }
    }
}
