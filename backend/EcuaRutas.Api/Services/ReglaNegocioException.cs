namespace EcuaRutas.Api.Services;

public class ReglaNegocioException : Exception
{
    public int StatusCode { get; }

    public ReglaNegocioException(int statusCode, string message) : base(message)
        => StatusCode = statusCode;
}