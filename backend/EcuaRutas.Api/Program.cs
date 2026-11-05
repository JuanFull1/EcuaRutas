using System.Text;
using EcuaRutas.Api.Services;
using EcuaRutas.Api.Data;
using EcuaRutas.Api.Models;
using EcuaRutas.Api.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using EcuaRutas.Api.Configuration;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// --- SERVICIOS DE FLOTA Y RUTAS ---
builder.Services.AddScoped<IGrupoBusService, GrupoBusService>();
builder.Services.AddScoped<IBusService, BusService>();
builder.Services.AddScoped<IPlantillaService, PlantillaService>();
builder.Services.AddScoped<ILugarService, LugarService>();
builder.Services.AddScoped<IRutaService, RutaService>();
builder.Services.AddScoped<IRutaParadaService, RutaParadaService>();
builder.Services.AddScoped<IResolucionAntService, ResolucionAntService>();
builder.Services.AddScoped<IFrecuenciaService, FrecuenciaService>();
builder.Services.AddScoped<ITarifaFrecuenciaService, TarifaFrecuenciaService>();

// --- SERVICIOS DE USUARIOS Y COOPERATIVAS ---
builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<IUsuariosService, UsuariosService>();
builder.Services.AddScoped<ICooperativasService, CooperativasService>();

// --- SERVICIOS DE VIAJES Y OPERACIÓN (TUS SERVICIOS) ---
builder.Services.AddScoped<IHojaRutaService, HojaRutaService>();
builder.Services.AddScoped<IViajeService, ViajeService>();
builder.Services.AddScoped<IOperacionBusService, OperacionBusService>();
builder.Services.AddSingleton<IPosicionBusNotifier, SinNotificacionPosicionBus>();
builder.Services.AddScoped<IPosicionBusService, PosicionBusService>();

// --- SERVICIOS DE VENTAS Y PAGOS ---
builder.Services.AddScoped<PagosService>();
builder.Services.AddScoped<BoletosService>();
builder.Services.AddScoped<DisponibilidadService>();
builder.Services.AddScoped<VentasService>(); // Corregido: sin IVentasService
builder.Services.AddScoped<ClienteService>();
builder.Services.AddScoped<ReservasClienteService>();
builder.Services.AddScoped<NotificacionesService>();
builder.Services.AddScoped<ComprobantesStorageService>();

// --- CONFIGURACIONES ---
builder.Services.AddDbContext<EcuaRutasDbContext>(
    options => options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        o => o.UseNetTopologySuite()
    )
);

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<CorreoSmtpOptions>(builder.Configuration.GetSection(CorreoSmtpOptions.Seccion));

builder.Services.AddScoped<IPasswordHasher<Usuario>, PasswordHasher<Usuario>>();
builder.Services.AddScoped<CorreoSmtpService>();

// --- WORKERS (Tareas en segundo plano) ---
builder.Services.AddHostedService<NotificacionesCorreoWorker>();
builder.Services.AddHostedService<ReservasExpirationWorker>();

// --- CONFIGURACIÓN DE JWT ---
var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
    ?? throw new InvalidOperationException("No se encontró la configuración JWT.");

if (string.IsNullOrWhiteSpace(jwtSettings.Key))
{
    throw new InvalidOperationException("La clave JWT no está configurada.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "http://127.0.0.1:4200")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

await DevelopmentSeeder.SeedAsync(app.Services, app.Configuration, app.Environment);

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("Frontend");

var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot", "uploads");
Directory.CreateDirectory(uploadsPath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();