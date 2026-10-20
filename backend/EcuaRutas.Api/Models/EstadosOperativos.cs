namespace EcuaRutas.Api.Models;

public static class ModosGeneracion
{
    public const string Manual = "MANUAL";
    public const string Automatica = "AUTOMATICA";
}

public static class EstadosHojaRuta
{
    public const string Borrador = "BORRADOR";
    public const string Publicada = "PUBLICADA";
    public const string Cerrada = "CERRADA";
}

public static class TiposAsignacion
{
    public const string Servicio = "SERVICIO";
    public const string Parada = "PARADA"; // bus de reten / dia de parada
}

public static class EstadosViaje
{
    public const string Programado = "PROGRAMADO";
    public const string Abierto = "ABIERTO";
    public const string EnCurso = "EN_CURSO";
    public const string Finalizado = "FINALIZADO";
    public const string Cancelado = "CANCELADO";
}

public static class EstadosOcupacion
{
    public const string Abordado = "ABORDADO";
    public const string Liberado = "LIBERADO";
    public const string NoPresentado = "NO_PRESENTADO";
    public const string Cancelado = "CANCELADO";
}

public static class EstadosBus
{
    public const string Activo = "ACTIVO";
    public const string Mantenimiento = "MANTENIMIENTO";
    public const string Inactivo = "INACTIVO";
}