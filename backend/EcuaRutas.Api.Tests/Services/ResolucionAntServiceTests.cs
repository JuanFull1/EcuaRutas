using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Data.Common;
using System.Text.RegularExpressions;
using EcuaRutas.Api.Data;
using EcuaRutas.Api.DTOs.ResolucionesAnt;
using EcuaRutas.Api.Models;
using EcuaRutas.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;
using Xunit;

namespace EcuaRutas.Api.Tests.Services;

// Pruebas unitarias: consultas Npgsql interceptadas, guardado y transacción simulados.
// No se abre una conexión ni se verifican restricciones/bloqueos reales de PostgreSQL.
public class ResolucionAntServiceTests
{
    [Fact]
    public async Task ListarIncluyeInactivasProyectaOrdenaYNoRastrea()
    {
        await using var db = Contexto();
        db.Filas.AddRange([Fila(3, "B"), Fila(2, "A", activa: false), Fila(1, "A")]);
        var resultado = await Servicio(db).ListarAsync();
        Assert.Equal(new long[] { 1, 2, 3 }, resultado.Select(r => r.Id));
        Assert.False(resultado[1].Activa);
        Assert.Equal(new DateOnly(2025, 1, 2), resultado[0].FechaResolucion);
        Assert.Equal("documentos/ANT.pdf", resultado[0].ArchivoUrl);
        Assert.Equal(11, resultado[0].CooperativaId);
        Assert.Empty(db.ChangeTracker.Entries());
        var consulta = Assert.Single(db.Sql);
        Assert.Contains("ORDER BY", consulta);
        Assert.DoesNotContain("JOIN", consulta);
    }

    [Fact]
    public async Task ObtenerDevuelveDtoInactivoONullSinRastrear()
    {
        await using var db = Contexto();
        db.Filas.Add(Fila(long.MaxValue, activa: false));
        Assert.False((await Servicio(db).ObtenerAsync(long.MaxValue))!.Activa);
        Assert.Null(await Servicio(db).ObtenerAsync(999));
        Assert.Empty(db.ChangeTracker.Entries());
    }

    [Theory]
    [InlineData(0L)]
    [InlineData(-1L)]
    public async Task IdentificadorInvalidoNoConsultaNiEscribe(long id)
    {
        await using var db = Contexto();
        var servicio = Servicio(db);
        await Assert.ThrowsAsync<ValidationException>(() => servicio.ObtenerAsync(id));
        await Assert.ThrowsAsync<ValidationException>(() => servicio.ActualizarAsync(id, Actualizacion()));
        await Assert.ThrowsAsync<ValidationException>(() => servicio.DarDeBajaAsync(id));
        Assert.Empty(db.Sql);
        Assert.Equal(0, db.Guardados);
    }

    [Fact]
    public async Task CrearValidaCooperativaPreservaTextoYOpcionalesYActivaElRegistro()
    {
        await using var db = Contexto();
        var request = Creacion("  ANT Ab-01  ");
        var resultado = await Servicio(db).CrearAsync(request);
        Assert.True(resultado.Activa);
        Assert.True(resultado.Id > 0);
        Assert.Equal(request.NumeroResolucion, resultado.NumeroResolucion);
        Assert.Null(resultado.FechaResolucion);
        Assert.Null(resultado.ArchivoUrl);
        Assert.Single(db.Filas);
        Assert.Equal(1, db.Commits);
        Assert.Contains(db.Sql, sql => sql.Contains("FOR SHARE"));
    }

    [Fact]
    public async Task CrearConservaFechaYArchivoSinImponerFormatoNiFechaPasada()
    {
        await using var db = Contexto();
        var dto = Creacion();
        dto.FechaResolucion = DateOnly.MaxValue;
        dto.ArchivoUrl = "referencia interna";
        var resultado = await Servicio(db).CrearAsync(dto);
        Assert.Equal(dto.FechaResolucion, resultado.FechaResolucion);
        Assert.Equal(dto.ArchivoUrl, resultado.ArchivoUrl);
    }

    [Fact]
    public async Task CrearConCooperativaInexistenteDiferenciaInexistenciaDeConflicto()
    {
        await using var db = Contexto();
        db.CooperativasExistentes.Clear();
        await Assert.ThrowsAsync<RecursoNoEncontradoException>(() => Servicio(db).CrearAsync(Creacion()));
        Assert.Equal(0, db.Guardados);
        Assert.Equal(0, db.Commits);
        Assert.Equal(1, db.TransaccionesDispuestas);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task CrearRechazaDuplicadoActivoOInactivo(bool activa)
    {
        await using var db = Contexto();
        db.Filas.Add(Fila(1, activa: activa));
        await Assert.ThrowsAsync<ConflictoException>(() => Servicio(db).CrearAsync(Creacion()));
        Assert.Equal(0, db.Guardados);
        Assert.Equal(0, db.Commits);
    }

    [Fact]
    public async Task MismoNumeroEnOtraCooperativaNoEsDuplicadoGlobal()
    {
        await using var db = Contexto();
        db.Filas.Add(Fila(1, cooperativa: 22));
        Assert.Equal(11, (await Servicio(db).CrearAsync(Creacion())).CooperativaId);
    }

    [Theory]
    [InlineData("cooperativa")]
    [InlineData("vacio")]
    [InlineData("blanco")]
    [InlineData("numeroLargo")]
    [InlineData("archivoLargo")]
    public async Task ValidacionesDeDtoSeEjecutanEnCreacionYActualizacion(string defecto)
    {
        await using var db = Contexto();
        var crear = Creacion();
        var actualizar = Actualizacion();
        switch (defecto)
        {
            case "cooperativa": crear.CooperativaId = actualizar.CooperativaId = 0; break;
            case "vacio": crear.NumeroResolucion = actualizar.NumeroResolucion = ""; break;
            case "blanco": crear.NumeroResolucion = actualizar.NumeroResolucion = "   "; break;
            case "numeroLargo": crear.NumeroResolucion = actualizar.NumeroResolucion = new string('N', 101); break;
            case "archivoLargo": crear.ArchivoUrl = actualizar.ArchivoUrl = new string('A', 501); break;
        }
        await Assert.ThrowsAsync<ValidationException>(() => Servicio(db).CrearAsync(crear));
        await Assert.ThrowsAsync<ValidationException>(() => Servicio(db).ActualizarAsync(1, actualizar));
        Assert.Empty(db.Sql);
        Assert.Equal(0, db.Guardados);
    }

    [Fact]
    public async Task ActualizarPermiteMetadatosNulosYFalseConFrecuenciasSinCambiarCooperativa()
    {
        await using var db = Contexto();
        db.Filas.Add(Fila(1));
        db.Referenciadas.Add(1);
        var dto = Actualizacion("ANT-EDITADA");
        var resultado = await Servicio(db).ActualizarAsync(1, dto);
        Assert.NotNull(resultado);
        Assert.False(resultado.Activa);
        Assert.Null(resultado.FechaResolucion);
        Assert.Null(resultado.ArchivoUrl);
        Assert.Equal(dto.NumeroResolucion, resultado.NumeroResolucion);
        Assert.Contains(db.Sql, sql => sql.Contains("FOR UPDATE"));
        Assert.Single(db.Referenciadas);
        Assert.Equal(1, db.Commits);
    }

    [Fact]
    public async Task ActualizarExcluyePropioIdDeUnicidadYPermiteReactivacion()
    {
        await using var db = Contexto();
        db.Filas.Add(Fila(1, activa: false));
        var dto = Actualizacion(); dto.Activa = true;
        Assert.True((await Servicio(db).ActualizarAsync(1, dto))!.Activa);
    }

    [Fact]
    public async Task ActualizarInexistenteDevuelveNull()
    {
        await using var db = Contexto();
        Assert.Null(await Servicio(db).ActualizarAsync(999, Actualizacion()));
        Assert.Equal(0, db.Guardados);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ActualizarRechazaDuplicadosIncluidosInactivos(bool activa)
    {
        await using var db = Contexto();
        db.Filas.AddRange([Fila(1, "ANT-ORIGINAL"), Fila(2, activa: activa)]);
        await Assert.ThrowsAsync<ConflictoException>(() => Servicio(db).ActualizarAsync(1, Actualizacion()));
        Assert.Equal("ANT-ORIGINAL", db.Filas[0].NumeroResolucion);
    }

    [Fact]
    public async Task CambiarCooperativaReferenciadaProduceConflictoSinEscritura()
    {
        await using var db = Contexto();
        db.Filas.Add(Fila(1)); db.Referenciadas.Add(1);
        var dto = Actualizacion(); dto.CooperativaId = 22;
        await Assert.ThrowsAsync<ConflictoException>(() => Servicio(db).ActualizarAsync(1, dto));
        Assert.Equal(11, db.Filas[0].CooperativaId);
        Assert.Equal(0, db.Guardados);
    }

    [Fact]
    public async Task CambiarCooperativaSinReferenciasExigeExistencia()
    {
        await using var db = Contexto(); db.Filas.Add(Fila(1));
        var dto = Actualizacion(); dto.CooperativaId = 22;
        Assert.Equal(22, (await Servicio(db).ActualizarAsync(1, dto))!.CooperativaId);
        dto.CooperativaId = 99;
        await Assert.ThrowsAsync<RecursoNoEncontradoException>(() => Servicio(db).ActualizarAsync(1, dto));
    }

    [Fact]
    public async Task RecargaInstanciaRastreadaAntesDeComprobarCambioDeCooperativa()
    {
        await using var db = Contexto(); db.Filas.Add(Fila(1)); db.Referenciadas.Add(1);
        db.Attach(Fila(1, cooperativa: 22)); // copia obsoleta; la fila resuelta sigue perteneciendo a 11.
        var dto = Actualizacion(); dto.CooperativaId = 22;
        await Assert.ThrowsAsync<ConflictoException>(() => Servicio(db).ActualizarAsync(1, dto));
        Assert.Equal(0, db.Guardados);
    }

    [Fact]
    public async Task BajaLogicaEsIdempotenteConservaFilaYReferencias()
    {
        await using var db = Contexto(); db.Filas.Add(Fila(1)); db.Referenciadas.Add(1);
        Assert.True(await Servicio(db).DarDeBajaAsync(1));
        Assert.True(await Servicio(db).DarDeBajaAsync(1));
        Assert.False(Assert.Single(db.Filas).Activa);
        Assert.Contains(1L, db.Referenciadas);
        Assert.False(await Servicio(db).DarDeBajaAsync(999));
    }

    [Fact]
    public async Task TraduceSoloLaRestriccionUnicaEsperadaAlGuardar()
    {
        await using var db = Contexto();
        db.ErrorGuardado = ErrorPostgres("23505", "resoluciones_ant", "resoluciones_ant_cooperativa_id_numero_resolucion_key");
        await Assert.ThrowsAsync<ConflictoException>(() => Servicio(db).CrearAsync(Creacion()));
        Assert.Empty(db.Filas);
        Assert.Equal(0, db.Commits);
    }

    [Theory]
    [InlineData("23503", "resoluciones_ant", "resoluciones_ant_cooperativa_id_fkey")]
    [InlineData("23505", "otra_tabla", "otra_restriccion")]
    [InlineData("23505", "resoluciones_ant", "otra_restriccion")]
    [InlineData("23514", "resoluciones_ant", "otra_restriccion")]
    public async Task NoConvierteOtrasRestriccionesEnDuplicados(string estado, string tabla, string restriccion)
    {
        await using var db = Contexto(); db.ErrorGuardado = ErrorPostgres(estado, tabla, restriccion);
        var error = await Assert.ThrowsAsync<DbUpdateException>(() => Servicio(db).CrearAsync(Creacion()));
        Assert.Same(db.ErrorGuardado, error);
    }

    [Fact]
    public async Task ErrorTecnicoNoSeOcultaComoConflicto()
    {
        await using var db = Contexto(); db.ErrorGuardado = new InvalidOperationException("fallo técnico simulado");
        Assert.Same(db.ErrorGuardado, await Assert.ThrowsAsync<InvalidOperationException>(() => Servicio(db).CrearAsync(Creacion())));
    }

    [Fact]
    public async Task CancelacionInicialSePropagaEnTodasLasOperacionesSinSql()
    {
        await using var db = Contexto(); var servicio = Servicio(db);
        using var cancelacion = new CancellationTokenSource(); cancelacion.Cancel(); var ct = cancelacion.Token;
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.ListarAsync(ct));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.ObtenerAsync(1, ct));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.CrearAsync(Creacion(), ct));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.ActualizarAsync(1, Actualizacion(), ct));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => servicio.DarDeBajaAsync(1, ct));
        Assert.Empty(db.Sql);
    }

    [Fact]
    public async Task TokenSePropagaAConsultasGuardadoYCommit()
    {
        await using var db = Contexto(); using var cancelacion = new CancellationTokenSource();
        await Servicio(db).CrearAsync(Creacion(), cancelacion.Token);
        Assert.All(db.Tokens, token => Assert.Equal(cancelacion.Token, token));
        Assert.True(db.Tokens.Count >= 4);
    }

    private static IResolucionAntService Servicio(ContextoSimulado db) => new ResolucionAntService(db);
    private static ContextoSimulado Contexto() => new();
    private static CrearResolucionAntDto Creacion(string numero = "ANT-001") => new() { CooperativaId = 11, NumeroResolucion = numero };
    private static ActualizarResolucionAntDto Actualizacion(string numero = "ANT-001") => new() { CooperativaId = 11, NumeroResolucion = numero, Activa = false };
    private static ResolucionesAnt Fila(long id, string numero = "ANT-001", bool activa = true, long cooperativa = 11) => new()
    {
        Id = id, CooperativaId = cooperativa, NumeroResolucion = numero, Activa = activa,
        FechaResolucion = new DateOnly(2025, 1, 2), ArchivoUrl = "documentos/ANT.pdf"
    };
    private static DbUpdateException ErrorPostgres(string estado, string tabla, string restriccion) => new("simulado",
        new PostgresException("simulado", "ERROR", "ERROR", estado, tableName: tabla, constraintName: restriccion));

    private sealed class ContextoSimulado : EcuaRutasDbContext
    {
        public readonly List<ResolucionesAnt> Filas = [];
        public readonly HashSet<long> CooperativasExistentes = [11, 22];
        public readonly HashSet<long> Referenciadas = [];
        public readonly List<string> Sql = [];
        public readonly List<CancellationToken> Tokens = [];
        public Exception? ErrorGuardado;
        public int Guardados, Commits, TransaccionesDispuestas;
        private readonly DatabaseFacade fachada;
        public ContextoSimulado() : base(Opciones()) { fachada = new FachadaSimulada(this); }
        public override DatabaseFacade Database => fachada;

        private static DbContextOptions<EcuaRutasDbContext> Opciones() => new DbContextOptionsBuilder<EcuaRutasDbContext>()
            .UseNpgsql("Host=127.0.0.1;Port=1;Database=sin_conexion;Username=prueba", opciones => opciones.UseNetTopologySuite())
            .AddInterceptors(new ConexionSuprimida(), new ConsultasSimuladas()).Options;

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested(); Tokens.Add(cancellationToken);
            if (ErrorGuardado is not null) return Task.FromException<int>(ErrorGuardado);
            Guardados++;
            foreach (var entry in ChangeTracker.Entries<ResolucionesAnt>().ToList())
            {
                if (entry.State is not (EntityState.Added or EntityState.Modified)) continue;
                if (entry.State == EntityState.Added)
                {
                    entry.Property(r => r.Id).CurrentValue = 900 + Filas.Count;
                    entry.Property(r => r.Id).IsTemporary = false;
                }
                Filas.RemoveAll(fila => fila.Id == entry.Entity.Id);
                Filas.Add(new ResolucionesAnt
                {
                    Id = entry.Entity.Id, CooperativaId = entry.Entity.CooperativaId, NumeroResolucion = entry.Entity.NumeroResolucion,
                    Activa = entry.Entity.Activa, FechaResolucion = entry.Entity.FechaResolucion, ArchivoUrl = entry.Entity.ArchivoUrl
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
            db.Sql.Add(command.CommandText); db.Tokens.Add(cancellationToken);
            var parametros = command.Parameters.Cast<DbParameter>().ToArray();
            var id = parametros.FirstOrDefault(p => p.Value is long)?.Value as long?;
            DataTable tabla = new();
            if (command.CommandText.StartsWith("SELECT EXISTS", StringComparison.Ordinal))
            {
                bool existe;
                if (command.CommandText.Contains("FROM frecuencias")) existe = id.HasValue && db.Referenciadas.Contains(id.Value);
                else
                {
                    var cooperativa = (long)parametros.Single(p => p.ParameterName.Contains("cooperativaId")).Value!;
                    var numero = (string)parametros.Single(p => p.Value is string).Value!;
                    var excluido = parametros.FirstOrDefault(p => p.ParameterName.Contains("idActual"))?.Value as long?;
                    existe = db.Filas.Any(f => f.CooperativaId == cooperativa && f.NumeroResolucion == numero && f.Id != excluido);
                }
                tabla.Columns.Add("existe", typeof(bool)); tabla.Rows.Add(existe);
            }
            else if (command.CommandText.Contains("FROM cooperativas"))
            {
                tabla.Columns.Add("id", typeof(long));
                if (id.HasValue && db.CooperativasExistentes.Contains(id.Value)) tabla.Rows.Add(id.Value);
            }
            else if (command.CommandText.Contains("FROM resoluciones_ant"))
            {
                var cabecera = command.CommandText[..command.CommandText.IndexOf("FROM", StringComparison.Ordinal)];
                var columnas = Regex.Matches(cabecera, @"\b\w+\.(\w+)").Select(m => m.Groups[1].Value).ToArray();
                Assert.NotEmpty(columnas);
                foreach (var columna in columnas) tabla.Columns.Add(columna, columna switch
                {
                    "id" or "cooperativa_id" => typeof(long), "activa" => typeof(bool),
                    "fecha_resolucion" => typeof(DateOnly), _ => typeof(string)
                });
                foreach (var fila in db.Filas.Where(f => !id.HasValue || f.Id == id).OrderBy(f => f.NumeroResolucion).ThenBy(f => f.Id))
                    tabla.Rows.Add(columnas.Select<string, object>(columna => columna switch
                    {
                        "id" => fila.Id, "cooperativa_id" => fila.CooperativaId, "activa" => fila.Activa,
                        "numero_resolucion" => fila.NumeroResolucion, "fecha_resolucion" => (object?)fila.FechaResolucion ?? DBNull.Value,
                        "archivo_url" => (object?)fila.ArchivoUrl ?? DBNull.Value, _ => throw new InvalidOperationException(columna)
                    }).ToArray());
            }
            else throw new InvalidOperationException($"Consulta no contemplada por el doble: {command.CommandText}");
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
