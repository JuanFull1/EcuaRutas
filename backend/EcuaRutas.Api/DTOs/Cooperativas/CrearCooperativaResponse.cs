using EcuaRutas.Api.DTOs.Usuarios;

namespace EcuaRutas.Api.DTOs.Cooperativas;

public class CrearCooperativaResponse
{
    public CooperativaDto Cooperativa { get; set; } =
        new();

    public UsuarioDto Usuario { get; set; } =
        new();
}