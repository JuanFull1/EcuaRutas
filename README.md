# EcuaRutas

Sistema web para la gestión y venta de pasajes de transporte interprovincial en Ecuador.

Proyecto desarrollado para aplicar control de versiones, trabajo colaborativo y gestión de cambios.

## Tecnologías propuestas

El sistema se desarrollará inicialmente con las siguientes tecnologías:

- Frontend: Angular, TypeScript y Bootstrap.
- Backend: C# con .NET y ASP.NET Core Web API.
- Base de datos: PostgreSQL con extensión PostGIS.
- ORM: Entity Framework Core.
- Autenticación y autorización: JWT y control por roles.
- Comunicación en tiempo real: SignalR.
- Mapas: MapLibre GL JS.
- Control de versiones: Git y GitHub.
- Flujo de trabajo: GitFlow.
- Control de cambios: Jira Service Management.
- Contenedores: Docker y Docker Compose.

## Estructura actual

El proyecto se encuentra organizado inicialmente en los siguientes componentes:

- `backend/EcuaRutas.Api/`: API REST desarrollada con .NET.
- `frontend/`: aplicación web desarrollada con Angular.
- `database/`: scripts para la creación y actualización de PostgreSQL/PostGIS.

La estructura podrá ampliarse conforme se desarrollen los distintos módulos del sistema.

## Ejecución local

### Backend

Desde la raíz del proyecto:

```bash
dotnet restore backend/EcuaRutas.Api
dotnet build backend/EcuaRutas.Api
dotnet run --project backend/EcuaRutas.Api