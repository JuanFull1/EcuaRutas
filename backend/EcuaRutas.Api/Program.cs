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

var builder =
    WebApplication.CreateBuilder(
        args
    );

builder.Services
    .AddControllers();

builder.Services
    .AddOpenApi();

builder.Services.AddScoped<
    IGrupoBusService,
    GrupoBusService
>();

builder.Services.AddScoped<
    IBusService,
    BusService
>();

builder.Services.AddScoped<
    IPlantillaService,
    PlantillaService
>();

builder.Services.AddScoped<
    ILugarService,
    LugarService
>();

builder.Services.AddScoped<
    IRutaService,
    RutaService
>();

builder.Services.AddScoped<
    IRutaParadaService,
    RutaParadaService
>();

builder.Services.AddScoped<
    IHojaRutaService,
    HojaRutaService
>();

builder.Services.AddDbContext<
    EcuaRutasDbContext
>(
    options =>
        options.UseNpgsql(
            builder.Configuration
                .GetConnectionString(
                    "DefaultConnection"
                ),
            o =>
                o.UseNetTopologySuite()
        )
);

builder.Services.Configure<
    JwtSettings
>(
    builder.Configuration
        .GetSection(
            "Jwt"
        )
);

builder.Services.AddScoped<
    JwtService
>();

builder.Services.AddScoped<
    AuthService
>();

builder.Services.AddScoped<
    IUsuariosService,
    UsuariosService
>();

builder.Services.AddScoped<
    ICooperativasService,
    CooperativasService
>();

builder.Services.AddScoped<
    PagosService
>();

builder.Services.AddScoped<
    DisponibilidadService
>();

builder.Services.AddScoped<IHojaRutaService, HojaRutaService>();
builder.Services.AddScoped<IResolucionAntService, ResolucionAntService>();
builder.Services.AddScoped<IFrecuenciaService, FrecuenciaService>();
builder.Services.AddScoped<ITarifaFrecuenciaService, TarifaFrecuenciaService>();

builder.Services.AddScoped<
    IVentasService,
    VentasService
>();

builder.Services.AddScoped<
    ClienteService
>();

builder.Services.AddScoped<
    NotificacionesService
>();

builder.Services.Configure<CorreoSmtpOptions>(
    builder.Configuration.GetSection(
        CorreoSmtpOptions.Seccion
    )
);

builder.Services.AddScoped<
    CorreoSmtpService
>();

builder.Services.AddHostedService<
    NotificacionesCorreoWorker
>();

builder.Services.AddHostedService<
    ReservasExpirationWorker
>();

builder.Services.AddScoped<
    ComprobantesStorageService
>();

builder.Services.AddScoped<
    IViajeService,
    ViajeService
>();

builder.Services.AddScoped<
    IOperacionBusService,
    OperacionBusService
>();

builder.Services.AddSingleton<
    IPosicionBusNotifier,
    SinNotificacionPosicionBus
>();

builder.Services.AddScoped<
    IPosicionBusService,
    PosicionBusService
>();

builder.Services.AddScoped<
    IPasswordHasher<Usuario>,
    PasswordHasher<Usuario>
>();

var jwtSettings =
    builder.Configuration
        .GetSection(
            "Jwt"
        )
        .Get<JwtSettings>()
    ?? throw new InvalidOperationException(
        "No se encontró la configuración JWT."
    );

if (
    string.IsNullOrWhiteSpace(
        jwtSettings.Key
    )
)
{
    throw new InvalidOperationException(
        "La clave JWT no está configurada."
    );
}

builder.Services
    .AddAuthentication(
        JwtBearerDefaults
            .AuthenticationScheme
    )
    .AddJwtBearer(
        options =>
        {
            options
                .TokenValidationParameters =
                new TokenValidationParameters
                {
                    ValidateIssuer =
                        true,

                    ValidateAudience =
                        true,

                    ValidateLifetime =
                        true,

                    ValidateIssuerSigningKey =
                        true,

                    ValidIssuer =
                        jwtSettings.Issuer,

                    ValidAudience =
                        jwtSettings.Audience,

                    IssuerSigningKey =
                        new SymmetricSecurityKey(
                            Encoding.UTF8
                                .GetBytes(
                                    jwtSettings.Key
                                )
                        ),

                    ClockSkew =
                        TimeSpan.Zero
                };
        }
    );

builder.Services
    .AddAuthorization();

builder.Services.AddCors(
    options =>
    {
        options.AddPolicy(
            "Frontend",
            policy =>
            {
                policy
                    .WithOrigins(
                        "http://localhost:4200",
                        "http://127.0.0.1:4200"
                    )
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            }
        );
    }
);

var app =
    builder.Build();

await DevelopmentSeeder
    .SeedAsync(
        app.Services,
        app.Configuration,
        app.Environment
    );

if (
    app.Environment
        .IsDevelopment()
)
{
    app.MapOpenApi();
}

app.UseCors(
    "Frontend"
);

var uploadsPath =
    Path.Combine(
        app.Environment.ContentRootPath,
        "wwwroot",
        "uploads"
    );

Directory.CreateDirectory(
    uploadsPath
);

app.UseStaticFiles(
    new StaticFileOptions
    {
        FileProvider =
            new PhysicalFileProvider(
                uploadsPath
            ),

        RequestPath =
            "/uploads"
    }
);

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();