using EcuaRutas.Api.DTOs.Usuarios;

namespace EcuaRutas.Api.Services;

public interface IUsuariosService
{
    Task<IReadOnlyList<UsuarioDto>> ListarAsync(
        string? busqueda = null,
        long? rolId = null,
        bool? activo = null
    );

    Task<UsuarioDto?> ObtenerPorIdAsync(
        long id
    );

    Task<UsuarioDto> CrearAsync(
        CrearUsuarioRequest request
    );

    Task<UsuarioDto?> ActualizarAsync(
        long id,
        ActualizarUsuarioRequest request
    );

    Task<bool> CambiarEstadoAsync(
        long id,
        bool activo
    );

    Task<bool> RestablecerPasswordAsync(
        long id,
        string nuevaPassword
    );

    Task<IReadOnlyList<RolDto>>
        ListarRolesAsync();
}