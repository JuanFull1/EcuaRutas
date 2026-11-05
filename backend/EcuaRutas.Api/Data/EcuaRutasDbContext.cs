using System;
using System.Collections.Generic;
using EcuaRutas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Data;

public partial class EcuaRutasDbContext : DbContext
{
    public EcuaRutasDbContext(DbContextOptions<EcuaRutasDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AsientosBu> AsientosBus { get; set; }

    public virtual DbSet<Boleto> Boletos { get; set; }

    public virtual DbSet<Bus> Buses { get; set; }

    public virtual DbSet<Cooperativa> Cooperativas { get; set; }

    public virtual DbSet<ExtensionesBoleto> ExtensionesBoletos { get; set; }

    public virtual DbSet<Frecuencia> Frecuencias { get; set; }

    public virtual DbSet<GruposBuse> GruposBuses { get; set; }

    public virtual DbSet<HojaRutaDetalle> HojaRutaDetalles { get; set; }

    public virtual DbSet<HojasRutum> HojasRuta { get; set; }

    public virtual DbSet<Lugare> Lugares { get; set; }

    public virtual DbSet<Notificacione> Notificaciones { get; set; }

    public virtual DbSet<OcupacionesAsiento> OcupacionesAsientos { get; set; }

    public virtual DbSet<Pago> Pagos { get; set; }

    public virtual DbSet<Pasajero> Pasajeros { get; set; }

    public virtual DbSet<PlantillaAsiento> PlantillaAsientos { get; set; }

    public virtual DbSet<PlantillasBu> PlantillasBus { get; set; }

    public virtual DbSet<PosicionesBu> PosicionesBus { get; set; }

    public virtual DbSet<ResolucionesAnt> ResolucionesAnts { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Ruta> Rutas { get; set; }

    public virtual DbSet<RutaParada> RutaParadas { get; set; }

    public virtual DbSet<TarifasFrecuencium> TarifasFrecuencia { get; set; }

    public virtual DbSet<TiposAsiento> TiposAsientos { get; set; }

    public virtual DbSet<Usuario> Usuarios { get; set; }

    public virtual DbSet<ValidacionesBoleto> ValidacionesBoletos { get; set; }

    public virtual DbSet<Venta> Ventas { get; set; }

    public virtual DbSet<VentaAsiento> VentaAsientos { get; set; }

    public virtual DbSet<Viaje> Viajes { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasPostgresExtension("btree_gist")
            .HasPostgresExtension("postgis");

        modelBuilder.Entity<AsientosBu>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("asientos_bus_pkey");

            entity.ToTable("asientos_bus");

            entity.HasIndex(e => new { e.BusId, e.Numero }, "asientos_bus_bus_id_numero_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Activo)
                .HasDefaultValue(true)
                .HasColumnName("activo");
            entity.Property(e => e.BusId).HasColumnName("bus_id");
            entity.Property(e => e.Columna).HasColumnName("columna");
            entity.Property(e => e.Fila).HasColumnName("fila");
            entity.Property(e => e.Numero)
                .HasMaxLength(10)
                .HasColumnName("numero");
            entity.Property(e => e.Piso)
                .HasDefaultValue((short)1)
                .HasColumnName("piso");
            entity.Property(e => e.TipoAsientoId).HasColumnName("tipo_asiento_id");

            entity.HasOne(d => d.Bus).WithMany(p => p.AsientosBus)
                .HasForeignKey(d => d.BusId)
                .HasConstraintName("asientos_bus_bus_id_fkey");

            entity.HasOne(d => d.TipoAsiento).WithMany(p => p.AsientosBus)
                .HasForeignKey(d => d.TipoAsientoId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("asientos_bus_tipo_asiento_id_fkey");
        });

        modelBuilder.Entity<Boleto>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("boletos_pkey");

            entity.ToTable("boletos");

            entity.HasIndex(e => e.CodigoBoleto, "boletos_codigo_boleto_key").IsUnique();

            entity.HasIndex(e => e.QrToken, "boletos_qr_token_key").IsUnique();

            entity.HasIndex(e => e.VentaAsientoId, "boletos_venta_asiento_id_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ArchivoUrl)
                .HasMaxLength(500)
                .HasColumnName("archivo_url");
            entity.Property(e => e.CodigoBoleto)
                .HasMaxLength(60)
                .HasColumnName("codigo_boleto");
            entity.Property(e => e.Estado)
                .HasMaxLength(20)
                .HasDefaultValueSql("'ACTIVO'::character varying")
                .HasColumnName("estado");
            entity.Property(e => e.GeneradoEn)
                .HasDefaultValueSql("now()")
                .HasColumnName("generado_en");
            entity.Property(e => e.QrToken)
                .HasMaxLength(255)
                .HasColumnName("qr_token");
            entity.Property(e => e.VentaAsientoId).HasColumnName("venta_asiento_id");

            entity.HasOne(d => d.VentaAsiento).WithOne(p => p.Boleto)
                .HasForeignKey<Boleto>(d => d.VentaAsientoId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("boletos_venta_asiento_id_fkey");
        });

        modelBuilder.Entity<Bus>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("buses_pkey");

            entity.ToTable("buses");

            entity.HasIndex(e => new { e.CooperativaId, e.NumeroInterno }, "buses_cooperativa_id_numero_interno_key").IsUnique();

            entity.HasIndex(e => e.Placa, "buses_placa_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Anio).HasColumnName("anio");
            entity.Property(e => e.Capacidad).HasColumnName("capacidad");
            entity.Property(e => e.Color)
                .HasMaxLength(50)
                .HasColumnName("color");
            entity.Property(e => e.CooperativaId).HasColumnName("cooperativa_id");
            entity.Property(e => e.CreadoEn)
                .HasDefaultValueSql("now()")
                .HasColumnName("creado_en");
            entity.Property(e => e.Estado)
                .HasMaxLength(30)
                .HasDefaultValueSql("'ACTIVO'::character varying")
                .HasColumnName("estado");
            entity.Property(e => e.FotoUrl)
                .HasMaxLength(500)
                .HasColumnName("foto_url");
            entity.Property(e => e.GrupoBusId).HasColumnName("grupo_bus_id");
            entity.Property(e => e.MarcaCarroceria)
                .HasMaxLength(100)
                .HasColumnName("marca_carroceria");
            entity.Property(e => e.MarcaChasis)
                .HasMaxLength(100)
                .HasColumnName("marca_chasis");
            entity.Property(e => e.Modelo)
                .HasMaxLength(100)
                .HasColumnName("modelo");
            entity.Property(e => e.NumeroInterno)
                .HasMaxLength(30)
                .HasColumnName("numero_interno");
            entity.Property(e => e.Pisos)
                .HasDefaultValue((short)1)
                .HasColumnName("pisos");
            entity.Property(e => e.Placa)
                .HasMaxLength(20)
                .HasColumnName("placa");
            entity.Property(e => e.PlantillaId).HasColumnName("plantilla_id");
            entity.Property(e => e.TieneBanio).HasColumnName("tiene_banio");

            entity.HasOne(d => d.Cooperativa).WithMany(p => p.Buses)
                .HasForeignKey(d => d.CooperativaId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("buses_cooperativa_id_fkey");

            entity.HasOne(d => d.GrupoBus).WithMany(p => p.Buses)
                .HasForeignKey(d => d.GrupoBusId)
                .HasConstraintName("buses_grupo_bus_id_fkey");

            entity.HasOne(d => d.Plantilla).WithMany(p => p.Buses)
                .HasForeignKey(d => d.PlantillaId)
                .HasConstraintName("buses_plantilla_id_fkey");
        });

        modelBuilder.Entity<Cooperativa>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("cooperativas_pkey");

            entity.ToTable("cooperativas");

            entity.HasIndex(e => e.Ruc, "cooperativas_ruc_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Activa)
                .HasDefaultValue(true)
                .HasColumnName("activa");
            entity.Property(e => e.ColorPrimario)
                .HasMaxLength(20)
                .HasColumnName("color_primario");
            entity.Property(e => e.ColorSecundario)
                .HasMaxLength(20)
                .HasColumnName("color_secundario");
            entity.Property(e => e.Correo)
                .HasMaxLength(150)
                .HasColumnName("correo");
            entity.Property(e => e.CreadoEn)
                .HasDefaultValueSql("now()")
                .HasColumnName("creado_en");
            entity.Property(e => e.Descripcion).HasColumnName("descripcion");
            entity.Property(e => e.Direccion).HasColumnName("direccion");
            entity.Property(e => e.InformacionSoporte).HasColumnName("informacion_soporte");
            entity.Property(e => e.LogoUrl)
                .HasMaxLength(500)
                .HasColumnName("logo_url");
            entity.Property(e => e.Nombre)
                .HasMaxLength(150)
                .HasColumnName("nombre");
            entity.Property(e => e.RedesSociales)
                .HasDefaultValueSql("'{}'::jsonb")
                .HasColumnType("jsonb")
                .HasColumnName("redes_sociales");
            entity.Property(e => e.Ruc)
                .HasMaxLength(20)
                .HasColumnName("ruc");
            entity.Property(e => e.Telefono)
                .HasMaxLength(30)
                .HasColumnName("telefono");
        });

        modelBuilder.Entity<ExtensionesBoleto>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("extensiones_boleto_pkey");

            entity.ToTable("extensiones_boleto");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreadoEn)
                .HasDefaultValueSql("now()")
                .HasColumnName("creado_en");
            entity.Property(e => e.DestinoAnteriorId).HasColumnName("destino_anterior_id");
            entity.Property(e => e.DestinoNuevoId).HasColumnName("destino_nuevo_id");
            entity.Property(e => e.MetodoPago)
                .HasMaxLength(30)
                .HasColumnName("metodo_pago");
            entity.Property(e => e.MontoAdicional)
                .HasPrecision(10, 2)
                .HasColumnName("monto_adicional");
            entity.Property(e => e.Observacion).HasColumnName("observacion");
            entity.Property(e => e.UsuarioBusId).HasColumnName("usuario_bus_id");
            entity.Property(e => e.VentaAsientoId).HasColumnName("venta_asiento_id");

            entity.HasOne(d => d.DestinoAnterior).WithMany(p => p.ExtensionesBoletoDestinoAnteriors)
                .HasForeignKey(d => d.DestinoAnteriorId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("extensiones_boleto_destino_anterior_id_fkey");

            entity.HasOne(d => d.DestinoNuevo).WithMany(p => p.ExtensionesBoletoDestinoNuevos)
                .HasForeignKey(d => d.DestinoNuevoId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("extensiones_boleto_destino_nuevo_id_fkey");

            entity.HasOne(d => d.UsuarioBus).WithMany(p => p.ExtensionesBoletos)
                .HasForeignKey(d => d.UsuarioBusId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("extensiones_boleto_usuario_bus_id_fkey");

            entity.HasOne(d => d.VentaAsiento).WithMany(p => p.ExtensionesBoletos)
                .HasForeignKey(d => d.VentaAsientoId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("extensiones_boleto_venta_asiento_id_fkey");
        });

        modelBuilder.Entity<Frecuencia>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("frecuencias_pkey");

            entity.ToTable("frecuencias");

            entity.HasIndex(e => new { e.CooperativaId, e.RutaId, e.HoraSalida }, "frecuencias_cooperativa_id_ruta_id_hora_salida_key").IsUnique();

            entity.HasIndex(e => new { e.CooperativaId, e.Activa }, "idx_frecuencias_cooperativa");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Activa)
                .HasDefaultValue(true)
                .HasColumnName("activa");
            entity.Property(e => e.Codigo)
                .HasMaxLength(50)
                .HasColumnName("codigo");
            entity.Property(e => e.CooperativaId).HasColumnName("cooperativa_id");
            entity.Property(e => e.HoraSalida).HasColumnName("hora_salida");
            entity.Property(e => e.ResolucionAntId).HasColumnName("resolucion_ant_id");
            entity.Property(e => e.RutaId).HasColumnName("ruta_id");

            entity.HasOne(d => d.Cooperativa).WithMany(p => p.Frecuencia)
                .HasForeignKey(d => d.CooperativaId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("frecuencias_cooperativa_id_fkey");

            entity.HasOne(d => d.ResolucionAnt).WithMany(p => p.Frecuencia)
                .HasForeignKey(d => d.ResolucionAntId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("frecuencias_resolucion_ant_id_fkey");

            entity.HasOne(d => d.Ruta).WithMany(p => p.Frecuencia)
                .HasForeignKey(d => d.RutaId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("frecuencias_ruta_id_fkey");
        });

        modelBuilder.Entity<GruposBuse>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("grupos_buses_pkey");

            entity.ToTable("grupos_buses");

            entity.HasIndex(e => new { e.CooperativaId, e.Nombre }, "grupos_buses_cooperativa_id_nombre_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Activo)
                .HasDefaultValue(true)
                .HasColumnName("activo");
            entity.Property(e => e.CooperativaId).HasColumnName("cooperativa_id");
            entity.Property(e => e.Descripcion).HasColumnName("descripcion");
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .HasColumnName("nombre");

            entity.HasOne(d => d.Cooperativa).WithMany(p => p.GruposBuses)
                .HasForeignKey(d => d.CooperativaId)
                .HasConstraintName("grupos_buses_cooperativa_id_fkey");
        });

        modelBuilder.Entity<HojaRutaDetalle>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("hoja_ruta_detalles_pkey");

            entity.ToTable("hoja_ruta_detalles");

            entity.HasIndex(e => new { e.HojaRutaId, e.BusId, e.OrdenDia }, "hoja_ruta_detalles_hoja_ruta_id_bus_id_orden_dia_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BusId).HasColumnName("bus_id");
            entity.Property(e => e.FrecuenciaId).HasColumnName("frecuencia_id");
            entity.Property(e => e.HojaRutaId).HasColumnName("hoja_ruta_id");
            entity.Property(e => e.HoraProgramada).HasColumnName("hora_programada");
            entity.Property(e => e.Observacion).HasColumnName("observacion");
            entity.Property(e => e.OrdenDia)
                .HasDefaultValue(1)
                .HasColumnName("orden_dia");
            entity.Property(e => e.TipoAsignacion)
                .HasMaxLength(20)
                .HasColumnName("tipo_asignacion");

            entity.HasOne(d => d.Bus).WithMany(p => p.HojaRutaDetalles)
                .HasForeignKey(d => d.BusId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("hoja_ruta_detalles_bus_id_fkey");

            entity.HasOne(d => d.Frecuencia).WithMany(p => p.HojaRutaDetalles)
                .HasForeignKey(d => d.FrecuenciaId)
                .HasConstraintName("hoja_ruta_detalles_frecuencia_id_fkey");

            entity.HasOne(d => d.HojaRuta).WithMany(p => p.HojaRutaDetalles)
                .HasForeignKey(d => d.HojaRutaId)
                .HasConstraintName("hoja_ruta_detalles_hoja_ruta_id_fkey");
        });

        modelBuilder.Entity<HojasRutum>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("hojas_ruta_pkey");

            entity.ToTable("hojas_ruta");

            entity.HasIndex(e => new { e.GrupoBusId, e.Fecha }, "hojas_ruta_grupo_bus_id_fecha_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CooperativaId).HasColumnName("cooperativa_id");
            entity.Property(e => e.CreadoEn)
                .HasDefaultValueSql("now()")
                .HasColumnName("creado_en");
            entity.Property(e => e.Estado)
                .HasMaxLength(20)
                .HasDefaultValueSql("'BORRADOR'::character varying")
                .HasColumnName("estado");
            entity.Property(e => e.Fecha).HasColumnName("fecha");
            entity.Property(e => e.GrupoBusId).HasColumnName("grupo_bus_id");
            entity.Property(e => e.ModoGeneracion)
                .HasMaxLength(20)
                .HasDefaultValueSql("'MANUAL'::character varying")
                .HasColumnName("modo_generacion");

            entity.HasOne(d => d.Cooperativa).WithMany(p => p.HojasRuta)
                .HasForeignKey(d => d.CooperativaId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("hojas_ruta_cooperativa_id_fkey");

            entity.HasOne(d => d.GrupoBus).WithMany(p => p.HojasRuta)
                .HasForeignKey(d => d.GrupoBusId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("hojas_ruta_grupo_bus_id_fkey");
        });

        modelBuilder.Entity<Lugare>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("lugares_pkey");

            entity.ToTable("lugares");

            entity.HasIndex(e => e.Ubicacion, "idx_lugares_ubicacion").HasMethod("gist");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Activo)
                .HasDefaultValue(true)
                .HasColumnName("activo");
            entity.Property(e => e.Canton)
                .HasMaxLength(100)
                .HasColumnName("canton");
            entity.Property(e => e.Nombre)
                .HasMaxLength(150)
                .HasColumnName("nombre");
            entity.Property(e => e.Provincia)
                .HasMaxLength(100)
                .HasColumnName("provincia");
            entity.Property(e => e.Tipo)
                .HasMaxLength(30)
                .HasColumnName("tipo");
            entity.Property(e => e.Ubicacion)
                .HasColumnType("geography(Point,4326)")
                .HasColumnName("ubicacion");
        });

        modelBuilder.Entity<Notificacione>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("notificaciones_pkey");

            entity.ToTable("notificaciones");

            entity.HasIndex(e => e.Estado, "idx_notificaciones_estado");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Asunto)
                .HasMaxLength(200)
                .HasColumnName("asunto");
            entity.Property(e => e.CorreoDestino)
                .HasMaxLength(150)
                .HasColumnName("correo_destino");
            entity.Property(e => e.CreadoEn)
                .HasDefaultValueSql("now()")
                .HasColumnName("creado_en");
            entity.Property(e => e.EnviadoEn).HasColumnName("enviado_en");
            entity.Property(e => e.Estado)
                .HasMaxLength(20)
                .HasDefaultValueSql("'PENDIENTE'::character varying")
                .HasColumnName("estado");
            entity.Property(e => e.Tipo)
                .HasMaxLength(50)
                .HasColumnName("tipo");
            entity.Property(e => e.UsuarioId).HasColumnName("usuario_id");
            entity.Property(e => e.VentaId).HasColumnName("venta_id");

            entity.HasOne(d => d.Usuario).WithMany(p => p.Notificaciones)
                .HasForeignKey(d => d.UsuarioId)
                .HasConstraintName("notificaciones_usuario_id_fkey");

            entity.HasOne(d => d.Venta).WithMany(p => p.Notificaciones)
                .HasForeignKey(d => d.VentaId)
                .HasConstraintName("notificaciones_venta_id_fkey");
        });

        modelBuilder.Entity<OcupacionesAsiento>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("ocupaciones_asiento_pkey");

            entity.ToTable("ocupaciones_asiento");

            entity.HasIndex(e => new { e.ViajeId, e.AsientoBusId }, "uq_ocupacion_activa_asiento")
                .IsUnique()
                .HasFilter("((estado)::text = 'ABORDADO'::text)");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AbordadoEn)
                .HasDefaultValueSql("now()")
                .HasColumnName("abordado_en");
            entity.Property(e => e.AsientoBusId).HasColumnName("asiento_bus_id");
            entity.Property(e => e.Estado)
                .HasMaxLength(20)
                .HasDefaultValueSql("'ABORDADO'::character varying")
                .HasColumnName("estado");
            entity.Property(e => e.LiberadoEn).HasColumnName("liberado_en");
            entity.Property(e => e.Observacion).HasColumnName("observacion");
            entity.Property(e => e.ParadaAbordajeId).HasColumnName("parada_abordaje_id");
            entity.Property(e => e.ParadaLiberacionId).HasColumnName("parada_liberacion_id");
            entity.Property(e => e.PasajeroId).HasColumnName("pasajero_id");
            entity.Property(e => e.UsuarioBusAbordajeId).HasColumnName("usuario_bus_abordaje_id");
            entity.Property(e => e.UsuarioBusLiberacionId).HasColumnName("usuario_bus_liberacion_id");
            entity.Property(e => e.VentaAsientoId).HasColumnName("venta_asiento_id");
            entity.Property(e => e.ViajeId).HasColumnName("viaje_id");

            entity.HasOne(d => d.AsientoBus).WithMany(p => p.OcupacionesAsientos)
                .HasForeignKey(d => d.AsientoBusId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("ocupaciones_asiento_asiento_bus_id_fkey");

            entity.HasOne(d => d.ParadaAbordaje).WithMany(p => p.OcupacionesAsientoParadaAbordajes)
                .HasForeignKey(d => d.ParadaAbordajeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("ocupaciones_asiento_parada_abordaje_id_fkey");

            entity.HasOne(d => d.ParadaLiberacion).WithMany(p => p.OcupacionesAsientoParadaLiberacions)
                .HasForeignKey(d => d.ParadaLiberacionId)
                .HasConstraintName("ocupaciones_asiento_parada_liberacion_id_fkey");

            entity.HasOne(d => d.Pasajero).WithMany(p => p.OcupacionesAsientos)
                .HasForeignKey(d => d.PasajeroId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("ocupaciones_asiento_pasajero_id_fkey");

            entity.HasOne(d => d.UsuarioBusAbordaje).WithMany(p => p.OcupacionesAsientoUsuarioBusAbordajes)
                .HasForeignKey(d => d.UsuarioBusAbordajeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("ocupaciones_asiento_usuario_bus_abordaje_id_fkey");

            entity.HasOne(d => d.UsuarioBusLiberacion).WithMany(p => p.OcupacionesAsientoUsuarioBusLiberacions)
                .HasForeignKey(d => d.UsuarioBusLiberacionId)
                .HasConstraintName("ocupaciones_asiento_usuario_bus_liberacion_id_fkey");

            entity.HasOne(d => d.VentaAsiento).WithMany(p => p.OcupacionesAsientos)
                .HasForeignKey(d => d.VentaAsientoId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("ocupaciones_asiento_venta_asiento_id_fkey");

            entity.HasOne(d => d.Viaje).WithMany(p => p.OcupacionesAsientos)
                .HasForeignKey(d => d.ViajeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("ocupaciones_asiento_viaje_id_fkey");
        });

        modelBuilder.Entity<Pago>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("pagos_pkey");

            entity.ToTable("pagos");

            entity.HasIndex(e => e.VentaId, "idx_pagos_venta");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ComprobanteUrl)
                .HasMaxLength(500)
                .HasColumnName("comprobante_url");
            entity.Property(e => e.CreadoEn)
                .HasDefaultValueSql("now()")
                .HasColumnName("creado_en");
            entity.Property(e => e.Estado)
                .HasMaxLength(30)
                .HasDefaultValueSql("'PENDIENTE'::character varying")
                .HasColumnName("estado");
            entity.Property(e => e.Metodo)
                .HasMaxLength(30)
                .HasColumnName("metodo");
            entity.Property(e => e.Monto)
                .HasPrecision(10, 2)
                .HasColumnName("monto");
            entity.Property(e => e.Observacion).HasColumnName("observacion");
            entity.Property(e => e.UsuarioValidadorId).HasColumnName("usuario_validador_id");
            entity.Property(e => e.ValidadoEn).HasColumnName("validado_en");
            entity.Property(e => e.VentaId).HasColumnName("venta_id");

            entity.HasOne(d => d.UsuarioValidador).WithMany(p => p.Pagos)
                .HasForeignKey(d => d.UsuarioValidadorId)
                .HasConstraintName("pagos_usuario_validador_id_fkey");

            entity.HasOne(d => d.Venta).WithMany(p => p.Pagos)
                .HasForeignKey(d => d.VentaId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("pagos_venta_id_fkey");
        });

        modelBuilder.Entity<Pasajero>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("pasajeros_pkey");

            entity.ToTable("pasajeros");

            entity.HasIndex(e => e.Documento, "pasajeros_documento_key").IsUnique();

            entity.HasIndex(e => e.UsuarioId, "pasajeros_usuario_id_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Apellidos)
                .HasMaxLength(120)
                .HasColumnName("apellidos");
            entity.Property(e => e.CarnetConadis)
                .HasMaxLength(50)
                .HasColumnName("carnet_conadis");
            entity.Property(e => e.Correo)
                .HasMaxLength(150)
                .HasColumnName("correo");
            entity.Property(e => e.CreadoEn)
                .HasDefaultValueSql("now()")
                .HasColumnName("creado_en");
            entity.Property(e => e.Discapacidad).HasColumnName("discapacidad");
            entity.Property(e => e.Documento)
                .HasMaxLength(30)
                .HasColumnName("documento");
            entity.Property(e => e.FechaNacimiento).HasColumnName("fecha_nacimiento");
            entity.Property(e => e.Nombres)
                .HasMaxLength(120)
                .HasColumnName("nombres");
            entity.Property(e => e.Telefono)
                .HasMaxLength(30)
                .HasColumnName("telefono");
            entity.Property(e => e.TipoDocumento)
                .HasMaxLength(20)
                .HasDefaultValueSql("'CEDULA'::character varying")
                .HasColumnName("tipo_documento");
            entity.Property(e => e.UsuarioId).HasColumnName("usuario_id");

            entity.HasOne(d => d.Usuario).WithOne(p => p.Pasajero)
                .HasForeignKey<Pasajero>(d => d.UsuarioId)
                .HasConstraintName("pasajeros_usuario_id_fkey");
        });

        modelBuilder.Entity<PlantillaAsiento>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("plantilla_asientos_pkey");

            entity.ToTable("plantilla_asientos");

            entity.HasIndex(e => new { e.PlantillaId, e.Numero }, "plantilla_asientos_plantilla_id_numero_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Activo)
                .HasDefaultValue(true)
                .HasColumnName("activo");
            entity.Property(e => e.Columna).HasColumnName("columna");
            entity.Property(e => e.Fila).HasColumnName("fila");
            entity.Property(e => e.Numero)
                .HasMaxLength(10)
                .HasColumnName("numero");
            entity.Property(e => e.Piso)
                .HasDefaultValue((short)1)
                .HasColumnName("piso");
            entity.Property(e => e.PlantillaId).HasColumnName("plantilla_id");
            entity.Property(e => e.TipoAsientoId).HasColumnName("tipo_asiento_id");

            entity.HasOne(d => d.Plantilla).WithMany(p => p.PlantillaAsientos)
                .HasForeignKey(d => d.PlantillaId)
                .HasConstraintName("plantilla_asientos_plantilla_id_fkey");

            entity.HasOne(d => d.TipoAsiento).WithMany(p => p.PlantillaAsientos)
                .HasForeignKey(d => d.TipoAsientoId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("plantilla_asientos_tipo_asiento_id_fkey");
        });

        modelBuilder.Entity<PlantillasBu>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("plantillas_bus_pkey");

            entity.ToTable("plantillas_bus");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Activa)
                .HasDefaultValue(true)
                .HasColumnName("activa");
            entity.Property(e => e.CooperativaId).HasColumnName("cooperativa_id");
            entity.Property(e => e.Nombre)
                .HasMaxLength(120)
                .HasColumnName("nombre");
            entity.Property(e => e.Pisos)
                .HasDefaultValue((short)1)
                .HasColumnName("pisos");
            entity.Property(e => e.TieneBanio).HasColumnName("tiene_banio");

            entity.HasOne(d => d.Cooperativa).WithMany(p => p.PlantillasBus)
                .HasForeignKey(d => d.CooperativaId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("plantillas_bus_cooperativa_id_fkey");
        });

        modelBuilder.Entity<PosicionesBu>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("posiciones_bus_pkey");

            entity.ToTable("posiciones_bus");

            entity.HasIndex(e => e.Ubicacion, "idx_posiciones_bus_ubicacion").HasMethod("gist");

            entity.HasIndex(e => new { e.ViajeId, e.RegistradoEn }, "idx_posiciones_bus_viaje_fecha").IsDescending(false, true);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BusId).HasColumnName("bus_id");
            entity.Property(e => e.PrecisionMetros)
                .HasPrecision(8, 2)
                .HasColumnName("precision_metros");
            entity.Property(e => e.RegistradoEn)
                .HasDefaultValueSql("now()")
                .HasColumnName("registrado_en");
            entity.Property(e => e.Ubicacion)
                .HasColumnType("geography(Point,4326)")
                .HasColumnName("ubicacion");
            entity.Property(e => e.VelocidadKmh)
                .HasPrecision(6, 2)
                .HasColumnName("velocidad_kmh");
            entity.Property(e => e.ViajeId).HasColumnName("viaje_id");

            entity.HasOne(d => d.Bus).WithMany(p => p.PosicionesBus)
                .HasForeignKey(d => d.BusId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("posiciones_bus_bus_id_fkey");

            entity.HasOne(d => d.Viaje).WithMany(p => p.PosicionesBus)
                .HasForeignKey(d => d.ViajeId)
                .HasConstraintName("posiciones_bus_viaje_id_fkey");
        });

        modelBuilder.Entity<ResolucionesAnt>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("resoluciones_ant_pkey");

            entity.ToTable("resoluciones_ant");

            entity.HasIndex(e => new { e.CooperativaId, e.NumeroResolucion }, "resoluciones_ant_cooperativa_id_numero_resolucion_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Activa)
                .HasDefaultValue(true)
                .HasColumnName("activa");
            entity.Property(e => e.ArchivoUrl)
                .HasMaxLength(500)
                .HasColumnName("archivo_url");
            entity.Property(e => e.CooperativaId).HasColumnName("cooperativa_id");
            entity.Property(e => e.FechaResolucion).HasColumnName("fecha_resolucion");
            entity.Property(e => e.NumeroResolucion)
                .HasMaxLength(100)
                .HasColumnName("numero_resolucion");

            entity.HasOne(d => d.Cooperativa).WithMany(p => p.ResolucionesAnts)
                .HasForeignKey(d => d.CooperativaId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("resoluciones_ant_cooperativa_id_fkey");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("roles_pkey");

            entity.ToTable("roles");

            entity.HasIndex(e => e.Codigo, "roles_codigo_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Codigo)
                .HasMaxLength(30)
                .HasColumnName("codigo");
            entity.Property(e => e.Nombre)
                .HasMaxLength(80)
                .HasColumnName("nombre");
        });

        modelBuilder.Entity<Ruta>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("rutas_pkey");

            entity.ToTable("rutas");

            entity.HasIndex(e => new { e.OrigenLugarId, e.DestinoLugarId }, "idx_rutas_origen_destino");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Activa)
                .HasDefaultValue(true)
                .HasColumnName("activa");
            entity.Property(e => e.DestinoLugarId).HasColumnName("destino_lugar_id");
            entity.Property(e => e.Nombre)
                .HasMaxLength(200)
                .HasColumnName("nombre");
            entity.Property(e => e.OrigenLugarId).HasColumnName("origen_lugar_id");
            entity.Property(e => e.TipoViaje)
                .HasMaxLength(30)
                .HasColumnName("tipo_viaje");

            entity.HasOne(d => d.DestinoLugar).WithMany(p => p.RutaDestinoLugars)
                .HasForeignKey(d => d.DestinoLugarId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("rutas_destino_lugar_id_fkey");

            entity.HasOne(d => d.OrigenLugar).WithMany(p => p.RutaOrigenLugars)
                .HasForeignKey(d => d.OrigenLugarId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("rutas_origen_lugar_id_fkey");
        });

        modelBuilder.Entity<RutaParada>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("ruta_paradas_pkey");

            entity.ToTable("ruta_paradas");

            entity.HasIndex(e => new { e.RutaId, e.LugarId }, "ruta_paradas_ruta_id_lugar_id_key").IsUnique();

            entity.HasIndex(e => new { e.RutaId, e.Orden }, "ruta_paradas_ruta_id_orden_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.KmAcumulado)
                .HasPrecision(10, 2)
                .HasColumnName("km_acumulado");
            entity.Property(e => e.LugarId).HasColumnName("lugar_id");
            entity.Property(e => e.MinutosAcumulados).HasColumnName("minutos_acumulados");
            entity.Property(e => e.Orden).HasColumnName("orden");
            entity.Property(e => e.PermiteAscenso)
                .HasDefaultValue(true)
                .HasColumnName("permite_ascenso");
            entity.Property(e => e.PermiteDescenso)
                .HasDefaultValue(true)
                .HasColumnName("permite_descenso");
            entity.Property(e => e.RutaId).HasColumnName("ruta_id");

            entity.HasOne(d => d.Lugar).WithMany(p => p.RutaParada)
                .HasForeignKey(d => d.LugarId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("ruta_paradas_lugar_id_fkey");

            entity.HasOne(d => d.Ruta).WithMany(p => p.RutaParada)
                .HasForeignKey(d => d.RutaId)
                .HasConstraintName("ruta_paradas_ruta_id_fkey");
        });

        modelBuilder.Entity<TarifasFrecuencium>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tarifas_frecuencia_pkey");

            entity.ToTable("tarifas_frecuencia");

            entity.HasIndex(e => new { e.FrecuenciaId, e.OrigenRutaParadaId, e.DestinoRutaParadaId }, "tarifas_frecuencia_frecuencia_id_origen_ruta_parada_id_dest_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Activa)
                .HasDefaultValue(true)
                .HasColumnName("activa");
            entity.Property(e => e.DestinoRutaParadaId).HasColumnName("destino_ruta_parada_id");
            entity.Property(e => e.FrecuenciaId).HasColumnName("frecuencia_id");
            entity.Property(e => e.OrigenRutaParadaId).HasColumnName("origen_ruta_parada_id");
            entity.Property(e => e.PrecioBase)
                .HasPrecision(10, 2)
                .HasColumnName("precio_base");

            entity.HasOne(d => d.DestinoRutaParada).WithMany(p => p.TarifasFrecuenciumDestinoRutaParada)
                .HasForeignKey(d => d.DestinoRutaParadaId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("tarifas_frecuencia_destino_ruta_parada_id_fkey");

            entity.HasOne(d => d.Frecuencia).WithMany(p => p.TarifasFrecuencia)
                .HasForeignKey(d => d.FrecuenciaId)
                .HasConstraintName("tarifas_frecuencia_frecuencia_id_fkey");

            entity.HasOne(d => d.OrigenRutaParada).WithMany(p => p.TarifasFrecuenciumOrigenRutaParada)
                .HasForeignKey(d => d.OrigenRutaParadaId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("tarifas_frecuencia_origen_ruta_parada_id_fkey");
        });

        modelBuilder.Entity<TiposAsiento>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tipos_asiento_pkey");

            entity.ToTable("tipos_asiento");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Activo)
                .HasDefaultValue(true)
                .HasColumnName("activo");
            entity.Property(e => e.CooperativaId).HasColumnName("cooperativa_id");
            entity.Property(e => e.Nombre)
                .HasMaxLength(80)
                .HasColumnName("nombre");
            entity.Property(e => e.RecargoPorcentaje)
                .HasPrecision(5, 2)
                .HasColumnName("recargo_porcentaje");

            entity.HasOne(d => d.Cooperativa).WithMany(p => p.TiposAsientos)
                .HasForeignKey(d => d.CooperativaId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("tipos_asiento_cooperativa_id_fkey");
        });

        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("usuarios_pkey");

            entity.ToTable("usuarios");

            entity.HasIndex(e => e.Cedula, "uq_usuarios_cedula")
                .IsUnique()
                .HasFilter("(cedula IS NOT NULL)");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Activo)
                .HasDefaultValue(true)
                .HasColumnName("activo");
            entity.Property(e => e.ActualizadoEn)
                .HasDefaultValueSql("now()")
                .HasColumnName("actualizado_en");
            entity.Property(e => e.Apellidos)
                .HasMaxLength(120)
                .HasColumnName("apellidos");
            entity.Property(e => e.Cedula)
                .HasMaxLength(20)
                .HasColumnName("cedula");
            entity.Property(e => e.CooperativaId).HasColumnName("cooperativa_id");
            entity.Property(e => e.Correo)
                .HasMaxLength(150)
                .HasColumnName("correo");
            entity.Property(e => e.CreadoEn)
                .HasDefaultValueSql("now()")
                .HasColumnName("creado_en");
            entity.Property(e => e.Nombres)
                .HasMaxLength(120)
                .HasColumnName("nombres");
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash");
            entity.Property(e => e.RolId).HasColumnName("rol_id");
            entity.Property(e => e.Telefono)
                .HasMaxLength(30)
                .HasColumnName("telefono");

            entity.HasOne(d => d.Cooperativa).WithMany(p => p.Usuarios)
                .HasForeignKey(d => d.CooperativaId)
                .HasConstraintName("usuarios_cooperativa_id_fkey");

            entity.HasOne(d => d.Rol).WithMany(p => p.Usuarios)
                .HasForeignKey(d => d.RolId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("usuarios_rol_id_fkey");
        });

        modelBuilder.Entity<ValidacionesBoleto>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("validaciones_boletos_pkey");

            entity.ToTable("validaciones_boletos");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BoletoId).HasColumnName("boleto_id");
            entity.Property(e => e.Observacion).HasColumnName("observacion");
            entity.Property(e => e.Resultado)
                .HasMaxLength(20)
                .HasColumnName("resultado");
            entity.Property(e => e.UsuarioBusId).HasColumnName("usuario_bus_id");
            entity.Property(e => e.ValidadoEn)
                .HasDefaultValueSql("now()")
                .HasColumnName("validado_en");
            entity.Property(e => e.ViajeId).HasColumnName("viaje_id");

            entity.HasOne(d => d.Boleto).WithMany(p => p.ValidacionesBoletos)
                .HasForeignKey(d => d.BoletoId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("validaciones_boletos_boleto_id_fkey");

            entity.HasOne(d => d.UsuarioBus).WithMany(p => p.ValidacionesBoletos)
                .HasForeignKey(d => d.UsuarioBusId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("validaciones_boletos_usuario_bus_id_fkey");

            entity.HasOne(d => d.Viaje).WithMany(p => p.ValidacionesBoletos)
                .HasForeignKey(d => d.ViajeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("validaciones_boletos_viaje_id_fkey");
        });

        modelBuilder.Entity<Venta>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("ventas_pkey");

            entity.ToTable("ventas");

            entity.HasIndex(e => new { e.ViajeId, e.Estado }, "idx_ventas_viaje_estado");

            entity.HasIndex(e => e.Codigo, "ventas_codigo_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ActualizadoEn)
                .HasDefaultValueSql("now()")
                .HasColumnName("actualizado_en");
            entity.Property(e => e.Canal)
                .HasMaxLength(20)
                .HasColumnName("canal");
            entity.Property(e => e.Codigo)
                .HasMaxLength(50)
                .HasColumnName("codigo");
            entity.Property(e => e.CreadoEn)
                .HasDefaultValueSql("now()")
                .HasColumnName("creado_en");
            entity.Property(e => e.DescuentoTotal)
                .HasPrecision(10, 2)
                .HasColumnName("descuento_total");
            entity.Property(e => e.Estado)
                .HasMaxLength(30)
                .HasDefaultValueSql("'RESERVADA'::character varying")
                .HasColumnName("estado");
            entity.Property(e => e.ExpiraEn).HasColumnName("expira_en");
            entity.Property(e => e.Subtotal)
                .HasPrecision(10, 2)
                .HasColumnName("subtotal");
            entity.Property(e => e.Total)
                .HasPrecision(10, 2)
                .HasColumnName("total");
            entity.Property(e => e.UsuarioClienteId).HasColumnName("usuario_cliente_id");
            entity.Property(e => e.UsuarioVendedorId).HasColumnName("usuario_vendedor_id");
            entity.Property(e => e.ViajeId).HasColumnName("viaje_id");

            entity.HasOne(d => d.UsuarioCliente).WithMany(p => p.VentaUsuarioClientes)
                .HasForeignKey(d => d.UsuarioClienteId)
                .HasConstraintName("ventas_usuario_cliente_id_fkey");

            entity.HasOne(d => d.UsuarioVendedor).WithMany(p => p.VentaUsuarioVendedors)
                .HasForeignKey(d => d.UsuarioVendedorId)
                .HasConstraintName("ventas_usuario_vendedor_id_fkey");

            entity.HasOne(d => d.Viaje).WithMany(p => p.Venta)
                .HasForeignKey(d => d.ViajeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("ventas_viaje_id_fkey");
        });

        modelBuilder.Entity<VentaAsiento>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("venta_asientos_pkey");

            entity.ToTable("venta_asientos");

            entity.HasIndex(e => new { e.ViajeId, e.AsientoBusId, e.TramoPlanificado }, "ex_asiento_tramo_planificado")
                .HasFilter("((estado_asiento)::text = ANY ((ARRAY['RETENIDO'::character varying, 'CONFIRMADO'::character varying, 'UTILIZADO'::character varying])::text[]))")
                .HasMethod("gist");

            entity.HasIndex(e => e.ViajeId, "idx_venta_asientos_viaje");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AsientoBusId).HasColumnName("asiento_bus_id");
            entity.Property(e => e.CreadoEn)
                .HasDefaultValueSql("now()")
                .HasColumnName("creado_en");
            entity.Property(e => e.DestinoRutaParadaId).HasColumnName("destino_ruta_parada_id");
            entity.Property(e => e.EstadoAsiento)
                .HasMaxLength(30)
                .HasDefaultValueSql("'RETENIDO'::character varying")
                .HasColumnName("estado_asiento");
            entity.Property(e => e.OrdenDestino).HasColumnName("orden_destino");
            entity.Property(e => e.OrdenOrigen).HasColumnName("orden_origen");
            entity.Property(e => e.OrigenRutaParadaId).HasColumnName("origen_ruta_parada_id");
            entity.Property(e => e.PasajeroId).HasColumnName("pasajero_id");
            entity.Property(e => e.PorcentajeDescuento)
                .HasPrecision(5, 2)
                .HasColumnName("porcentaje_descuento");
            entity.Property(e => e.PrecioBase)
                .HasPrecision(10, 2)
                .HasColumnName("precio_base");
            entity.Property(e => e.PrecioFinal)
                .HasPrecision(10, 2)
                .HasColumnName("precio_final");
            entity.Property(e => e.RecargoAsiento)
                .HasPrecision(10, 2)
                .HasColumnName("recargo_asiento");
            entity.Property(e => e.TipoDescuento)
                .HasMaxLength(30)
                .HasDefaultValueSql("'NINGUNO'::character varying")
                .HasColumnName("tipo_descuento");
            entity.Property(e => e.TramoPlanificado)
                .HasComputedColumnSql("int4range(orden_origen, orden_destino, '[)'::text)", true)
                .HasColumnName("tramo_planificado");
            entity.Property(e => e.ValorDescuento)
                .HasPrecision(10, 2)
                .HasColumnName("valor_descuento");
            entity.Property(e => e.VentaId).HasColumnName("venta_id");
            entity.Property(e => e.ViajeId).HasColumnName("viaje_id");

            entity.HasOne(d => d.AsientoBus).WithMany(p => p.VentaAsientos)
                .HasForeignKey(d => d.AsientoBusId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("venta_asientos_asiento_bus_id_fkey");

            entity.HasOne(d => d.DestinoRutaParada).WithMany(p => p.VentaAsientoDestinoRutaParada)
                .HasForeignKey(d => d.DestinoRutaParadaId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("venta_asientos_destino_ruta_parada_id_fkey");

            entity.HasOne(d => d.OrigenRutaParada).WithMany(p => p.VentaAsientoOrigenRutaParada)
                .HasForeignKey(d => d.OrigenRutaParadaId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("venta_asientos_origen_ruta_parada_id_fkey");

            entity.HasOne(d => d.Pasajero).WithMany(p => p.VentaAsientos)
                .HasForeignKey(d => d.PasajeroId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("venta_asientos_pasajero_id_fkey");

            entity.HasOne(d => d.Venta).WithMany(p => p.VentaAsientos)
                .HasForeignKey(d => d.VentaId)
                .HasConstraintName("venta_asientos_venta_id_fkey");

            entity.HasOne(d => d.Viaje).WithMany(p => p.VentaAsientos)
                .HasForeignKey(d => d.ViajeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("venta_asientos_viaje_id_fkey");
        });

        modelBuilder.Entity<Viaje>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("viajes_pkey");

            entity.ToTable("viajes");

            entity.HasIndex(e => e.SalidaProgramada, "idx_viajes_salida");

            entity.HasIndex(e => e.HojaRutaDetalleId, "viajes_hoja_ruta_detalle_id_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BusId).HasColumnName("bus_id");
            entity.Property(e => e.Estado)
                .HasMaxLength(30)
                .HasDefaultValueSql("'PROGRAMADO'::character varying")
                .HasColumnName("estado");
            entity.Property(e => e.FinalizadoEn).HasColumnName("finalizado_en");
            entity.Property(e => e.FrecuenciaId).HasColumnName("frecuencia_id");
            entity.Property(e => e.HojaRutaDetalleId).HasColumnName("hoja_ruta_detalle_id");
            entity.Property(e => e.IniciadoEn).HasColumnName("iniciado_en");
            entity.Property(e => e.SalidaProgramada).HasColumnName("salida_programada");
            entity.Property(e => e.UsuarioBusId).HasColumnName("usuario_bus_id");

            entity.HasOne(d => d.Bus).WithMany(p => p.Viajes)
                .HasForeignKey(d => d.BusId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("viajes_bus_id_fkey");

            entity.HasOne(d => d.Frecuencia).WithMany(p => p.Viajes)
                .HasForeignKey(d => d.FrecuenciaId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("viajes_frecuencia_id_fkey");

            entity.HasOne(d => d.HojaRutaDetalle).WithOne(p => p.Viaje)
                .HasForeignKey<Viaje>(d => d.HojaRutaDetalleId)
                .HasConstraintName("viajes_hoja_ruta_detalle_id_fkey");

            entity.HasOne(d => d.UsuarioBus).WithMany(p => p.Viajes)
                .HasForeignKey(d => d.UsuarioBusId)
                .HasConstraintName("viajes_usuario_bus_id_fkey");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
