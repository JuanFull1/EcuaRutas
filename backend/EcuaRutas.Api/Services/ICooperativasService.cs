using EcuaRutas.Api.DTOs.Cooperativas;
using Microsoft.AspNetCore.Http;

namespace EcuaRutas.Api.Services;

public interface ICooperativasService
{
    Task<IReadOnlyList<CooperativaDto>> ListarAsync(
        string? busqueda,
        bool? activa
    );

    Task<CooperativaDto?> ObtenerPorIdAsync(
        long id
    );

    Task<CrearCooperativaResponse> CrearAsync(
        CrearCooperativaRequest request
    );

    Task<CooperativaDto?> ActualizarAdminAsync(
        long id,
        ActualizarCooperativaAdminRequest request
    );

    Task<bool> CambiarEstadoAsync(
        long id,
        bool activa
    );

    Task<CooperativaDto?> ObtenerMiCooperativaAsync(
        long cooperativaId
    );

    Task<CooperativaDto?> ActualizarMiCooperativaAsync(
        long cooperativaId,
        ActualizarMiCooperativaRequest request
    );

    Task<CooperativaDto?> ActualizarLogoAsync(
        long cooperativaId,
        IFormFile archivo
    );
}