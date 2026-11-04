using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Data.Common;
using System.Text.RegularExpressions;
using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.Frecuencias;
using EcuaRutas.Api.Models;
using EcuaRutas.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;
using Xunit;

namespace EcuaRutas.Api.Tests.Services;

// Pruebas unitarias: proveedor Npgsql con consultas interceptadas y guardado/
// transacciones simulados. Nunca abre conexiones ni prueba concurrencia PostgreSQL real.
public class FrecuenciaServiceTests
{
    [Fact]
    public async Task ListadoProyectaOrdenaIncluyeInactivasYNoRastrea()
    {
        await using var db = new ContextoSimulado();
        db.Filas.AddRange([Fila(3, new TimeOnly(8, 0)), Fila(2, activa: false), Fila(1)]);
        var resultado = await Servicio(db).ListarAsync();
        Assert.Equal(new long[] { 1, 2, 3 }, resultado.Select(f => f.Id));
        Assert.False(resultado[1].Activa);
        Assert.Equal(11, resultado[0].CooperativaId);
        Assert.Equal(22, resultado[0].RutaId);
        Assert.Equal(33, resultado[0].ResolucionAntId);
        Assert.Equal(" F-01 ", resultado[0].Codigo);
        Assert.Equal(TimeOnly.MinValue, resultado[0].HoraSalida);
        Assert.Empty(db.ChangeTracker.Entries());
        var sql = Assert.Single(db.Sql);
        Assert.Contains("ORDER BY", sql);
        Assert.DoesNotContain("JOIN", sql);
    }

    [Fact]
    public async Task FiltraPorCooperativaYRutaSinOmitirInactivas()
    {
        await using var db = new ContextoSimulado();
        db.Filas.AddRange([Fila(1), Fila(2, activa: false), Fila(3, cooperativa: 12), Fila(4, ruta: 23)]);
        Assert.Equal(3, (await Servicio(db).ListarAsync(cooperativaId: 11)).Count);
        Assert.Equal(3, (await Servicio(db).ListarAsync(rutaId: 22)).Count);
        Assert.Equal(new long[] { 1, 2 }, (await Servicio(db).ListarAsync(11, 22)).Select(f => f.Id));
        Assert.Empty(await Servicio(db).ListarAsync(cooperativaId: 999));
    }

    [Fact]
    public async Task ObtenerUsaLongDevuelveInactivasONullSinRastrear()
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(long.MaxValue, activa: false));
        Assert.False((await Servicio(db).ObtenerAsync(long.MaxValue))!.Activa);
        Assert.Null(await Servicio(db).ObtenerAsync(999));
        Assert.Empty(db.ChangeTracker.Entries());
    }

    [Theory]
    [InlineData(0L)]
    [InlineData(-1L)]
    public async Task IdYFiltrosInvalidosNoEjecutanSql(long id)
    {
        await using var db = new ContextoSimulado(); var servicio = Servicio(db);
        await Assert.ThrowsAsync<ValidationException>(() => servicio.ObtenerAsync(id));
        await Assert.ThrowsAsync<ValidationException>(() => servicio.ActualizarAsync(id, Actualizacion()));
        await Assert.ThrowsAsync<ValidationException>(() => servicio.DarDeBajaAsync(id));
        await Assert.ThrowsAsync<ValidationException>(() => servicio.ListarAsync(cooperativaId: id));
        await Assert.ThrowsAsync<ValidationException>(() => servicio.ListarAsync(rutaId: id));
        Assert.Empty(db.Sql);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" F-01 ")]
    public async Task CreacionActivaAceptaMedianocheYConservaCodigoOpcional(string? codigo)
    {
        await using var db = new ContextoSimulado(); var dto = Creacion(); dto.Codigo = codigo;
        var resultado = await Servicio(db).CrearAsync(dto);
        Assert.True(resultado.Activa);
        Assert.True(resultado.Id > 0);
        Assert.Equal(TimeOnly.MinValue, resultado.HoraSalida);
        Assert.Equal(codigo, resultado.Codigo);
        Assert.Single(db.Filas);
        Assert.Equal(1, db.Commits);
        Assert.Equal(3, db.Sql.Count(sql => sql.Contains("FOR SHARE")));
    }

    [Theory]
    [InlineData("cooperativa")]
    [InlineData("ruta")]
    [InlineData("resolucion")]
    public async Task ReferenciaInexistenteSeDistingueDeConflicto(string referencia)
    {
        await using var db = new ContextoSimulado();
        switch (referencia)
        {
            case "cooperativa": db.CooperativasResueltas.Clear(); break;
            case "ruta": db.RutasResueltas.Clear(); break;
            case "resolucion": db.Resoluciones.Clear(); break;
        }
        await Assert.ThrowsAsync<RecursoNoEncontradoException>(() => Servicio(db).CrearAsync(Creacion()));
        db.Filas.Add(Fila(1));
        await Assert.ThrowsAsync<RecursoNoEncontradoException>(() => Servicio(db).ActualizarAsync(1, Actualizacion()));
        Assert.Equal(0, db.Guardados);
        Assert.Equal(0, db.Commits);
    }

    [Fact]
    public async Task ResolucionDeOtraCooperativaSeRechazaMedianteValidador()
    {
        await using var db = new ContextoSimulado(); db.Resoluciones[0].CooperativaId = 12;
        var error = await Assert.ThrowsAsync<ConflictoException>(() => Servicio(db).CrearAsync(Creacion()));
        Assert.Contains("misma cooperativa", error.Message);
        Assert.Empty(db.Filas);
    }

    [Theory]
    [InlineData("cooperativa")]
    [InlineData("ruta")]
    [InlineData("resolucion")]
    public async Task CrearYReactivarExigenReferenciasActivas(string referencia)
    {
        await using var db = new ContextoSimulado(); DesactivarReferencia(db, referencia);
        await Assert.ThrowsAsync<ConflictoException>(() => Servicio(db).CrearAsync(Creacion()));
        db.Filas.Add(Fila(1, activa: false));
        var dto = Actualizacion(); dto.Activa = true;
        await Assert.ThrowsAsync<ConflictoException>(() => Servicio(db).ActualizarAsync(1, dto));
        Assert.Equal(0, db.Guardados);
    }

    [Theory]
    [InlineData("cooperativa")]
    [InlineData("ruta")]
    [InlineData("resolucion")]
    public async Task MetadatosConservanReferenciasInactivasYEstadoActual(string referencia)
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(1)); DesactivarReferencia(db, referencia);
        var dto = Actualizacion(); dto.Activa = true; dto.Codigo = null;
        var resultado = await Servicio(db).ActualizarAsync(1, dto);
        Assert.True(resultado!.Activa);
        Assert.Null(resultado.Codigo);
    }

    [Theory]
    [InlineData("cooperativa")]
    [InlineData("ruta")]
    [InlineData("resolucion")]
    [InlineData("hora")]
    [InlineData("codigo")]
    public async Task ValidaDtoAntesDeConsultarEnCreacionYActualizacion(string defecto)
    {
        await using var db = new ContextoSimulado(); var crear = Creacion(); var editar = Actualizacion();
        switch (defecto)
        {
            case "cooperativa": crear.CooperativaId = editar.CooperativaId = 0; break;
            case "ruta": crear.RutaId = editar.RutaId = -1; break;
            case "resolucion": crear.ResolucionAntId = editar.ResolucionAntId = 0; break;
            case "hora": crear.HoraSalida = editar.HoraSalida = null; break;
            case "codigo": crear.Codigo = editar.Codigo = new string('F', 51); break;
        }
        await Assert.ThrowsAsync<ValidationException>(() => Servicio(db).CrearAsync(crear));
        await Assert.ThrowsAsync<ValidationException>(() => Servicio(db).ActualizarAsync(1, editar));
        Assert.Empty(db.Sql);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task DuplicadoActivoOInactivoImpideAltaYActualizacion(bool activa)
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(1, activa: activa));
        await Assert.ThrowsAsync<ConflictoException>(() => Servicio(db).CrearAsync(Creacion()));
        db.Filas.Add(Fila(2, new TimeOnly(1, 0)));
        await Assert.ThrowsAsync<ConflictoException>(() => Servicio(db).ActualizarAsync(2, Actualizacion()));
        Assert.Equal(0, db.Guardados);
    }

    [Theory]
    [InlineData("cooperativa")]
    [InlineData("ruta")]
    [InlineData("hora")]
    public async Task CodigoNoEsUnicoYUnaClaveDiferentePermiteOtraFrecuencia(string campo)
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(1)); var dto = Creacion();
        switch (campo)
        {
            case "cooperativa": dto.CooperativaId = 12; dto.ResolucionAntId = 34; break;
            case "ruta": dto.RutaId = 23; break;
            case "hora": dto.HoraSalida = new TimeOnly(1, 0); break;
        }
        Assert.Equal(dto.Codigo, (await Servicio(db).CrearAsync(dto)).Codigo);
        Assert.Equal(2, db.Filas.Count);
    }

    [Theory]
    [InlineData("cooperativa")]
    [InlineData("ruta")]
    [InlineData("resolucion")]
    [InlineData("hora")]
    public async Task PermiteCambiosEstructuralesSinReferencias(string campo)
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(1)); var dto = Cambio(campo);
        var resultado = await Servicio(db).ActualizarAsync(1, dto);
        Assert.NotNull(resultado);
        Assert.Equal(dto.CooperativaId, resultado.CooperativaId);
        Assert.Equal(dto.RutaId, resultado.RutaId);
        Assert.Equal(dto.ResolucionAntId, resultado.ResolucionAntId);
        Assert.Equal(dto.HoraSalida, resultado.HoraSalida);
    }

    public static TheoryData<string, string> CambiosReferenciados
    {
        get
        {
            var casos = new TheoryData<string, string>();
            foreach (var campo in new[] { "cooperativa", "ruta", "resolucion", "hora" })
            foreach (var tabla in new[] { "viajes", "hoja_ruta_detalles", "tarifas_frecuencia" }) casos.Add(campo, tabla);
            return casos;
        }
    }

    [Theory]
    [MemberData(nameof(CambiosReferenciados))]
    public async Task ProtegeCadaCampoEstructuralFrenteACadaTipoDeReferencia(string campo, string tabla)
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(1)); db.Referencias[tabla].Add(1);
        await Assert.ThrowsAsync<ConflictoException>(() => Servicio(db).ActualizarAsync(1, Cambio(campo)));
        Assert.Equal(0, db.Guardados);
        Assert.Equal(0, db.Commits);
        Assert.Contains(db.Sql, sql => sql.Contains("FOR UPDATE"));
        Assert.Single(db.Referencias[tabla]);
    }

    [Fact]
    public async Task CambiarEstructuraDeFrecuenciaActivaExigeReferenciasActivas()
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(1)); db.RutasResueltas[23] = false;
        var dto = Cambio("ruta"); dto.Activa = true;
        await Assert.ThrowsAsync<ConflictoException>(() => Servicio(db).ActualizarAsync(1, dto));
        dto.Activa = false;
        Assert.False((await Servicio(db).ActualizarAsync(1, dto))!.Activa);
    }

    [Fact]
    public async Task ActualizacionConReferenciasPreservaCodigoNuloFalseYMedianoche()
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(1));
        foreach (var referencias in db.Referencias.Values) referencias.Add(1);
        var dto = Actualizacion(); dto.Codigo = null;
        var resultado = await Servicio(db).ActualizarAsync(1, dto);
        Assert.False(resultado!.Activa);
        Assert.Null(resultado.Codigo);
        Assert.Equal(TimeOnly.MinValue, resultado.HoraSalida);
        Assert.All(db.Referencias.Values, referencias => Assert.Single(referencias));
    }

    [Fact]
    public async Task ReactivaSinConfundirPropiaFilaConDuplicado()
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(1, activa: false));
        var dto = Actualizacion(); dto.Activa = true;
        Assert.True((await Servicio(db).ActualizarAsync(1, dto))!.Activa);
    }

    [Fact]
    public async Task ActualizarInexistenteDevuelveNull()
    {
        await using var db = new ContextoSimulado();
        Assert.Null(await Servicio(db).ActualizarAsync(999, Actualizacion()));
        Assert.Equal(0, db.Guardados);
    }

    [Fact]
    public async Task RefrescaInstanciaObsoletaAntesDeCompararEstructura()
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(1)); db.Referencias["viajes"].Add(1);
        db.Attach(Fila(1, new TimeOnly(1, 0)));
        await Assert.ThrowsAsync<ConflictoException>(() => Servicio(db).ActualizarAsync(1, Cambio("hora")));
        Assert.Equal(0, db.Guardados);
    }

    [Fact]
    public async Task BajaLogicaEsIdempotenteNoBorraNiModificaReferencias()
    {
        await using var db = new ContextoSimulado(); db.Filas.Add(Fila(1));
        foreach (var referencias in db.Referencias.Values) referencias.Add(1);
        Assert.True(await Servicio(db).DarDeBajaAsync(1));
        Assert.True(await Servicio(db).DarDeBajaAsync(1));
        Assert.False(Assert.Single(db.Filas).Activa);
        Assert.All(db.Referencias.Values, referencias => Assert.Contains(1L, referencias));
        Assert.False(await Servicio(db).DarDeBajaAsync(999));
    }

    [Fact]
    public async Task ConvierteSoloLaRestriccionUnicaDeFrecuenciasEnConflicto()
    {
        await using var db = new ContextoSimulado();
        db.ErrorGuardado = ErrorPostgres("23505", "frecuencias", "frecuencias_cooperativa_id_ruta_id_hora_salida_key");
        await Assert.ThrowsAsync<ConflictoException>(() => Servicio(db).CrearAsync(Creacion()));
        Assert.Empty(db.Filas);
        Assert.Equal(0, db.Commits);
        Assert.Equal(1, db.TransaccionesDispuestas);
    }

    [Theory]
    [InlineData("23503", "frecuencias", "frecuencias_ruta_id_fkey")]
    [InlineData("23505", "otra_tabla", "otra_restriccion")]
    [InlineData("23505", "frecuencias", "otra_restriccion")]
    [InlineData("23514", "frecuencias", "otra_restriccion")]
    public async Task NoDisfrazaOtrasRestriccionesComoDuplicidad(string estado, string tabla, string restriccion)
    {
        await using var db = new ContextoSimulado(); db.ErrorGuardado = ErrorPostgres(estado, tabla, restriccion);
        Assert.Same(db.ErrorGuardado, await Assert.ThrowsAsync<DbUpdateException>(() => Servicio(db).CrearAsync(Creacion())));
    }

    [Fact]
    public async Task ErrorTecnicoSePropaga()
    {
        await using var db = new ContextoSimulado(); db.ErrorGuardado = new InvalidOperationException("fallo técnico simulado");
        Assert.Same(db.ErrorGuardado, await Assert.ThrowsAsync<InvalidOperationException>(() => Servicio(db).CrearAsync(Creacion())));
    }

    [Fact]
    public async Task CancelacionInicialNoConsultaEnNingunaOperacion()
    {
        await using var db = new ContextoSimulado(); using var cancelacion = new CancellationTokenSource(); cancelacion.Cancel();
        var servicio = Servicio(db); var ct = cancelacion.Token;
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.ListarAsync(ct: ct));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.ObtenerAsync(1, ct));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.CrearAsync(Creacion(), ct));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.ActualizarAsync(1, Actualizacion(), ct));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.DarDeBajaAsync(1, ct));
        Assert.Empty(db.Sql);
    }

    [Fact]
    public async Task TokenSePropagaYCancelacionDuranteConsultaImpideGuardado()
    {
        await using var db = new ContextoSimulado(); using var cancelacion = new CancellationTokenSource();
        await Servicio(db).CrearAsync(Creacion(), cancelacion.Token);
        Assert.All(db.Tokens, token => Assert.Equal(cancelacion.Token, token));
        Assert.True(db.Tokens.Count >= 6);
        db.AlConsultar = _ => cancelacion.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Servicio(db).CrearAsync(Creacion(), cancelacion.Token));
        Assert.Equal(1, db.Guardados);
        Assert.Equal(1, db.Commits);
    }

    private static IFrecuenciaService Servicio(ContextoSimulado db) => new FrecuenciaService(db);
    private static Frecuencia Fila(long id, TimeOnly? hora = null, bool activa = true, long cooperativa = 11, long ruta = 22) => new()
    {
        Id = id, CooperativaId = cooperativa, RutaId = ruta, ResolucionAntId = 33,
        Codigo = " F-01 ", HoraSalida = hora ?? TimeOnly.MinValue, Activa = activa
    };
    private static CrearFrecuenciaDto Creacion() => new()
    {
        CooperativaId = 11, RutaId = 22, ResolucionAntId = 33, Codigo = " F-01 ", HoraSalida = TimeOnly.MinValue
    };
    private static ActualizarFrecuenciaDto Actualizacion() => new()
    {
        CooperativaId = 11, RutaId = 22, ResolucionAntId = 33, Codigo = " F-01 ", HoraSalida = TimeOnly.MinValue, Activa = false
    };
    private static ActualizarFrecuenciaDto Cambio(string campo)
    {
        var dto = Actualizacion();
        switch (campo)
        {
            case "cooperativa": dto.CooperativaId = 12; dto.ResolucionAntId = 34; break;
            case "ruta": dto.RutaId = 23; break;
            case "resolucion": dto.ResolucionAntId = 35; break;
            case "hora": dto.HoraSalida = new TimeOnly(1, 0); break;
        }
        return dto;
    }
    private static void DesactivarReferencia(ContextoSimulado db, string referencia)
    {
        switch (referencia)
        {
            case "cooperativa": db.CooperativasResueltas[11] = false; break;
            case "ruta": db.RutasResueltas[22] = false; break;
            case "resolucion": db.Resoluciones[0].Activa = false; break;
        }
    }
    private static DbUpdateException ErrorPostgres(string estado, string tabla, string restriccion) => new("simulado",
        new PostgresException("simulado", "ERROR", "ERROR", estado, tableName: tabla, constraintName: restriccion));

    private sealed class ContextoSimulado : EcuaRutasDbContext
    {
        public readonly List<Frecuencia> Filas = [];
        public readonly Dictionary<long, bool> CooperativasResueltas = new() { [11] = true, [12] = true };
        public readonly Dictionary<long, bool> RutasResueltas = new() { [22] = true, [23] = true };
        public readonly List<ResolucionesAnt> Resoluciones =
        [new() { Id = 33, CooperativaId = 11, Activa = true }, new() { Id = 34, CooperativaId = 12, Activa = true }, new() { Id = 35, CooperativaId = 11, Activa = true }];
        public readonly Dictionary<string, HashSet<long>> Referencias = new()
        { ["viajes"] = [], ["hoja_ruta_detalles"] = [], ["tarifas_frecuencia"] = [] };
        public readonly List<string> Sql = [];
        public readonly List<CancellationToken> Tokens = [];
        public Exception? ErrorGuardado;
        public Action<string>? AlConsultar;
        public int Guardados, Commits, TransaccionesDispuestas;
        private readonly DatabaseFacade fachada;
        public ContextoSimulado() : base(new DbContextOptionsBuilder<EcuaRutasDbContext>()
            .UseNpgsql("Host=127.0.0.1;Port=1;Database=sin_conexion;Username=prueba", opciones => opciones.UseNetTopologySuite())
            .AddInterceptors(new ConexionSuprimida(), new ConsultasSimuladas()).Options)
        { fachada = new FachadaSimulada(this); }
        public override DatabaseFacade Database => fachada;

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested(); Tokens.Add(cancellationToken);
            if (ErrorGuardado is not null) return Task.FromException<int>(ErrorGuardado);
            Guardados++;
            foreach (var entry in ChangeTracker.Entries<Frecuencia>().ToList())
            {
                if (entry.State is not (EntityState.Added or EntityState.Modified)) continue;
                if (entry.State == EntityState.Added)
                {
                    entry.Property(f => f.Id).CurrentValue = 900 + Filas.Count;
                    entry.Property(f => f.Id).IsTemporary = false;
                }
                Filas.RemoveAll(f => f.Id == entry.Entity.Id);
                Filas.Add(new Frecuencia
                {
                    Id = entry.Entity.Id, CooperativaId = entry.Entity.CooperativaId, RutaId = entry.Entity.RutaId,
                    ResolucionAntId = entry.Entity.ResolucionAntId, Codigo = entry.Entity.Codigo,
                    HoraSalida = entry.Entity.HoraSalida, Activa = entry.Entity.Activa
                });
            }
            ChangeTracker.AcceptAllChanges();
            return Task.FromResult(1);
        }
    }

    private sealed class ConexionSuprimida : DbConnectionInterceptor
    {
        public override ValueTask<InterceptionResult> ConnectionOpeningAsync(DbConnection connection, ConnectionEventData eventData,
            InterceptionResult result, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            return ValueTask.FromResult(InterceptionResult.Suppress());
        }
    }

    private sealed class ConsultasSimuladas : DbCommandInterceptor
    {
        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData,
            InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var db = (ContextoSimulado)eventData.Context!;
            var sql = command.CommandText;
            db.Sql.Add(sql); db.Tokens.Add(cancellationToken);
            db.AlConsultar?.Invoke(sql); cancellationToken.ThrowIfCancellationRequested();
            var parametros = command.Parameters.Cast<DbParameter>().ToArray();
            var id = parametros.FirstOrDefault(p => p.Value is long)?.Value as long?;
            long? Parametro(string nombre) => parametros.FirstOrDefault(p => p.ParameterName.Contains(nombre, StringComparison.OrdinalIgnoreCase))?.Value as long?;
            DataTable tabla = new();
            if (sql.StartsWith("SELECT EXISTS", StringComparison.Ordinal))
            {
                bool existe;
                if (sql.Contains("FROM viajes")) existe = id.HasValue && db.Referencias.Values.Any(referencias => referencias.Contains(id.Value));
                else
                {
                    var hora = (TimeOnly)parametros.Single(p => p.Value is TimeOnly).Value!;
                    var coop = Parametro("CooperativaId"); var ruta = Parametro("RutaId"); var excluido = Parametro("idActual");
                    existe = db.Filas.Any(f => f.CooperativaId == coop && f.RutaId == ruta && f.HoraSalida == hora && f.Id != excluido);
                }
                tabla.Columns.Add("existe", typeof(bool)); tabla.Rows.Add(existe);
            }
            else
            {
                IEnumerable<Dictionary<string, object?>> filas;
                if (sql.Contains("FROM resoluciones_ant")) filas = db.Resoluciones.Where(r => r.Id == id).Select(r => new Dictionary<string, object?>
                { ["id"] = r.Id, ["cooperativa_id"] = r.CooperativaId, ["activa"] = r.Activa });
                else if (sql.Contains("FROM cooperativas")) filas = db.CooperativasResueltas.Where(c => c.Key == id).Select(c => new Dictionary<string, object?>
                { ["id"] = c.Key, ["activa"] = c.Value });
                else if (sql.Contains("FROM rutas")) filas = db.RutasResueltas.Where(r => r.Key == id).Select(r => new Dictionary<string, object?>
                { ["id"] = r.Key, ["activa"] = r.Value });
                else if (sql.Contains("FROM frecuencias"))
                {
                    var coop = Parametro("cooperativaId"); var ruta = Parametro("rutaId");
                    var consulta = db.Filas.Where(f => (!coop.HasValue || f.CooperativaId == coop) && (!ruta.HasValue || f.RutaId == ruta));
                    if (!coop.HasValue && !ruta.HasValue && id.HasValue) consulta = consulta.Where(f => f.Id == id);
                    filas = consulta.OrderBy(f => f.CooperativaId).ThenBy(f => f.RutaId).ThenBy(f => f.HoraSalida).ThenBy(f => f.Id)
                        .Select(f => new Dictionary<string, object?>
                        {
                            ["id"] = f.Id, ["cooperativa_id"] = f.CooperativaId, ["ruta_id"] = f.RutaId,
                            ["resolucion_ant_id"] = f.ResolucionAntId, ["codigo"] = f.Codigo,
                            ["hora_salida"] = f.HoraSalida, ["activa"] = f.Activa
                        });
                }
                else throw new InvalidOperationException($"Consulta no contemplada: {sql}");
                var cabecera = sql[..sql.IndexOf("FROM", StringComparison.Ordinal)];
                var columnas = Regex.Matches(cabecera, @"\b\w+\.(\w+)").Select(m => m.Groups[1].Value).ToArray();
                Assert.NotEmpty(columnas);
                foreach (var columna in columnas) tabla.Columns.Add(columna, columna switch
                { "activa" => typeof(bool), "codigo" => typeof(string), "hora_salida" => typeof(TimeOnly), _ => typeof(long) });
                foreach (var fila in filas) tabla.Rows.Add(columnas.Select(columna => fila[columna] ?? DBNull.Value).ToArray());
            }
            return ValueTask.FromResult(InterceptionResult<DbDataReader>.SuppressWithResult(tabla.CreateDataReader()));
        }
    }

    private sealed class FachadaSimulada(ContextoSimulado db) : DatabaseFacade(db)
    {
        public override Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested(); db.Tokens.Add(cancellationToken);
            return Task.FromResult<IDbContextTransaction>(new TransaccionSimulada(db));
        }
    }

    private sealed class TransaccionSimulada(ContextoSimulado db) : IDbContextTransaction
    {
        public Guid TransactionId { get; } = Guid.NewGuid();
        public void Commit() => db.Commits++;
        public Task CommitAsync(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested(); db.Tokens.Add(cancellationToken); Commit(); return Task.CompletedTask;
        }
        public void Rollback() { }
        public Task RollbackAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public void Dispose() => db.TransaccionesDispuestas++;
        public ValueTask DisposeAsync() { Dispose(); return ValueTask.CompletedTask; }
    }
}
