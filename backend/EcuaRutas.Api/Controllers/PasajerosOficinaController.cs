using System.ComponentModel.DataAnnotations;
using EcuaRutas.Api.Data;
using EcuaRutas.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/pasajeros-oficina")]
[Authorize(Roles = "OFICINISTA")]
public sealed class PasajerosOficinaController : ControllerBase
{
    private readonly EcuaRutasDbContext _context;

    public PasajerosOficinaController(
        EcuaRutasDbContext context)
    {
        _context = context;
    }

    [HttpGet("documento/{documento}")]
    public async Task<IActionResult> ObtenerPorDocumento(
        string documento,
        CancellationToken ct)
    {
        var documentoNormalizado =
            documento.Trim();

        if (string.IsNullOrWhiteSpace(
            documentoNormalizado))
        {
            return BadRequest(new
            {
                mensaje =
                    "El documento es obligatorio."
            });
        }

        var pasajero =
            await _context.Pasajeros
                .AsNoTracking()
                .Where(
                    p =>
                        p.Documento ==
                        documentoNormalizado
                )
                .Select(
                    p => new
                    {
                        pasajeroId = p.Id,
                        p.TipoDocumento,
                        p.Documento,
                        p.Nombres,
                        p.Apellidos,
                        p.Correo,
                        p.Telefono,
                        p.Discapacidad
                    }
                )
                .FirstOrDefaultAsync(ct);

        if (pasajero is null)
        {
            return NotFound(new
            {
                mensaje =
                    "No existe un pasajero con ese documento."
            });
        }

        return Ok(pasajero);
    }

    [HttpPost]
    public async Task<IActionResult> Crear(
        [FromBody]
        CrearPasajeroOficinaRequest request,
        CancellationToken ct)
    {
        Validator.ValidateObject(
            request,
            new ValidationContext(request),
            validateAllProperties: true
        );

        var documento =
            request.Documento.Trim();

        var existente =
            await _context.Pasajeros
                .AsNoTracking()
                .Where(
                    pasajero =>
                        pasajero.Documento ==
                        documento
                )
                .Select(
                    pasajero => new
                    {
                        pasajeroId = pasajero.Id,
                        pasajero.TipoDocumento,
                        pasajero.Documento,
                        pasajero.Nombres,
                        pasajero.Apellidos,
                        pasajero.Correo,
                        pasajero.Telefono,
                        pasajero.Discapacidad
                    }
                )
                .FirstOrDefaultAsync(ct);

        if (existente is not null)
        {
            return Ok(existente);
        }

        var nuevo =
            new Pasajero
            {
                UsuarioId = null,

                TipoDocumento =
                    request.TipoDocumento.Trim()
                        .ToUpperInvariant(),

                Documento =
                    documento,

                Nombres =
                    request.Nombres.Trim(),

                Apellidos =
                    request.Apellidos.Trim(),

                Correo =
                    string.IsNullOrWhiteSpace(
                        request.Correo)
                        ? null
                        : request.Correo.Trim(),

                Telefono =
                    string.IsNullOrWhiteSpace(
                        request.Telefono)
                        ? null
                        : request.Telefono.Trim(),

                Discapacidad =
                    request.Discapacidad,

                CarnetConadis =
                    request.Discapacidad
                    &&
                    !string.IsNullOrWhiteSpace(
                        request.CarnetConadis)
                        ? request.CarnetConadis.Trim()
                        : null,

                CreadoEn =
                    DateTime.UtcNow
            };

        _context.Pasajeros.Add(nuevo);

        await _context.SaveChangesAsync(ct);

        return Ok(new
        {
            pasajeroId = nuevo.Id,
            nuevo.TipoDocumento,
            nuevo.Documento,
            nuevo.Nombres,
            nuevo.Apellidos,
            nuevo.Correo,
            nuevo.Telefono,
            nuevo.Discapacidad
        });
    }
}

public sealed class CrearPasajeroOficinaRequest
{
    [Required]
    [StringLength(20)]
    public string TipoDocumento { get; set; } =
        "CEDULA";

    [Required]
    [StringLength(30)]
    public string Documento { get; set; } =
        string.Empty;

    [Required]
    [StringLength(120)]
    public string Nombres { get; set; } =
        string.Empty;

    [Required]
    [StringLength(120)]
    public string Apellidos { get; set; } =
        string.Empty;

    [EmailAddress]
    [StringLength(150)]
    public string? Correo { get; set; }

    [StringLength(30)]
    public string? Telefono { get; set; }

    public bool Discapacidad { get; set; }

    [StringLength(50)]
    public string? CarnetConadis { get; set; }
}