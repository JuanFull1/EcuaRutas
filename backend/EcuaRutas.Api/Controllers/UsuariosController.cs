using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EcuaRutas.Api.Data;

namespace EcuaRutas.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsuariosController : ControllerBase
{
    private readonly EcuaRutasDbContext _context;

    public UsuariosController(EcuaRutasDbContext context)
    {
        _context = context;
    }

    // GET: api/usuarios
    [HttpGet]
    public async Task<IActionResult> GetUsuarios()
    {
        var lista = await _context.Usuarios
            .Select(u => new
            {
                u.Id,
                u.Nombres,
                u.Apellidos,
                u.Correo,
                u.Activo
            })
            .ToListAsync();

        return Ok(lista);
    }
}