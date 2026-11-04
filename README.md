# EcuaRutas

**Sistema web para la gestión de transporte interprovincial y la consulta, reserva y venta de pasajes en Ecuador.**

EcuaRutas es un proyecto de desarrollo colaborativo que integra procesos de cooperativas de transporte, administración de flota, rutas, viajes, ventas, pagos y servicios para pasajeros. También se utiliza para aplicar control de versiones, gestión de cambios, revisión de código y trabajo en equipo mediante Git y GitHub.

> **Estado del proyecto:** en desarrollo. La disponibilidad real de cada pantalla o función depende de los módulos integrados en la rama que se utilice.

## Tecnologías

| Componente | Tecnología |
| --- | --- |
| Interfaz web | Angular 22, TypeScript, HTML, CSS, Bootstrap 5 y Bootstrap Icons |
| API | C#, ASP.NET Core Web API y .NET 10 |
| Persistencia | PostgreSQL 18, PostGIS, Entity Framework Core 10, Npgsql y NetTopologySuite |
| Seguridad | Autenticación JWT y autorización basada en roles |
| Envío de correos | SMTP y configuración mediante User Secrets / variables de entorno |
| Control de versiones | Git y GitHub, con flujo basado en GitFlow |

**Tecnologías contempladas en la arquitectura:** MapLibre GL JS (mapas), SignalR (actualizaciones en tiempo real) y Docker / Docker Compose (contenedores). La guía del equipo las prevé, pero no demuestra que todas sus funciones estén completamente implementadas o validadas.

## Módulos del sistema

- **Autenticación y roles:** acceso diferenciado para `ADMIN`, `COOPERATIVA`, `OFICINISTA`, `CLIENTE` y `BUS`.
- **Cooperativas y flota:** información de cooperativas, buses, grupos, plantillas y asientos.
- **Rutas y viajes:** lugares, paradas, frecuencias, itinerarios y disponibilidad.
- **Ventas y pagos:** reservas, venta de pasajes, registro de pagos y comprobantes.
- **Portal del cliente:** búsqueda de viajes, historial de compras, consulta de boletos y notificaciones.
- **Notificaciones por correo:** registro de avisos relacionados con operaciones de reserva y pago; procesamiento SMTP sujeto a configuración y validación de integración.
- **Operación del bus:** funciones relacionadas con viajes, abordaje y control de pasajeros, según el avance de los módulos del equipo.

## Equipo y distribución de módulos

El proyecto se desarrolla de forma colaborativa por seis integrantes, con responsabilidades distribuidas por módulos. La asignación corresponde a la guía técnica del equipo; no implica que todas las funciones previstas estén ya finalizadas.

| Integrante | Área de trabajo |
| --- | --- |
| Juan | Administración, usuarios, roles, autenticación y cooperativas. |
| Damaris | Flota de buses, grupos, plantillas y asientos. |
| Bryan | Rutas, paradas, frecuencias, resoluciones y tarifas. |
| Eve | Hojas de ruta, viajes y operación del personal del bus. |
| Vicky | Reservas, ventas, disponibilidad, boletos y QR. |
| Tati | Pagos, comprobantes, portal del cliente y notificaciones. |

La aplicación contempla los roles `ADMIN`, `COOPERATIVA`, `OFICINISTA`, `CLIENTE` y `BUS`.

## Organización del repositorio

```text
EcuaRutas/
├── backend/
│   └── EcuaRutas.Api/       # API ASP.NET Core
├── frontend/                # Aplicación Angular
├── database/                # EcuaRutas.sql y scripts de actualización
├── docs/                    # Documentación técnica y funcional
├── tools/                   # Herramientas auxiliares (cuando existan)
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
└── LICENSE
```

## Arquitectura y organización de código

El frontend Angular consume la API REST ASP.NET Core mediante HTTP/JSON. El backend organiza la lógica en `Controllers/`, `Services/`, `DTOs/`, `Models/`, `Data/` y `Security/`, utiliza EF Core con Npgsql para PostgreSQL y puede trabajar con datos espaciales mediante PostGIS.

Los módulos Angular se organizan directamente en `frontend/src/app/` (por ejemplo, `cliente/`, `ventas/`, `buses/`, `viajes/`), reutilizan `shared/layout/` y procuran definir rutas propias. Los cambios en `app.routes.ts`, `Program.cs`, `EcuaRutasDbContext.cs` o `database/EcuaRutas.sql` deben coordinarse entre integrantes.

## Requisitos para desarrollo local

- .NET SDK 10.
- Node.js 24 o compatible con Angular 22; npm.
- PostgreSQL 18 con PostGIS compatible (la guía utiliza PostGIS 3.6).
- Git.

La configuración de la base de datos y los permisos dependen del entorno de desarrollo. **No ejecutes el script de creación inicial sobre una base con datos existentes sin revisarlo previamente.**

## Ejecución local

Los siguientes comandos se ejecutan desde la **raíz del repositorio**.

### 1. Backend

```powershell
dotnet restore .\backend\EcuaRutas.Api\EcuaRutas.Api.csproj
dotnet build .\backend\EcuaRutas.Api\EcuaRutas.Api.csproj
dotnet run --project .\backend\EcuaRutas.Api\EcuaRutas.Api.csproj
```

Configura de forma local `ConnectionStrings:DefaultConnection` y los secretos necesarios para autenticación mediante `dotnet user-secrets` u otra fuente segura admitida por la aplicación. **Nunca publiques los valores reales.**

### 2. Frontend

En otra terminal:

```powershell
cd .\frontend
npm install
npm run build
npm start
```

Abre la URL que muestre Angular (habitualmente `http://localhost:4200`). La URL y los puertos de la API dependen de la configuración local.

### 3. Base de datos

Para una instalación nueva se utiliza `database/EcuaRutas.sql` en una base llamada `ecuarutas`, con PostGIS habilitado. No ejecutes nuevamente todo el script inicial sobre una base existente; los cambios posteriores requieren scripts de actualización revisados y coordinados con el equipo.

### 4. Notificaciones por correo (opcional)

El servicio SMTP requiere una cuenta remitente y su configuración segura. Para desarrollo, el procesamiento automático debe permanecer desactivado hasta validar los estados de PostgreSQL y el envío controlado:

```text
Correo:Habilitado = false
```

La herramienta `tools/EcuaRutas.CorreoTest/` permite una prueba puntual de SMTP en la rama que la contiene. El envío individual a Gmail se verificó, pero las pruebas integradas del trabajador con PostgreSQL y la recuperación ante interrupciones deben distinguirse de esa verificación. No subas contraseñas de aplicación ni archivos locales de secretos.

## Documentación y colaboración

- [Documentación del módulo de flota](docs/flota.md)
- [Guía de contribución](CONTRIBUTING.md)
- [Política de seguridad](SECURITY.md)
- [Código de conducta](CODE_OF_CONDUCT.md)
- [Licencia](LICENSE)

La integración sigue GitFlow (`main`, `develop`, `feature/*`, `release/*`, `hotfix/*`). Los cambios se proponen mediante Pull Requests hacia `develop`, conforme a las reglas de colaboración del equipo. Los cambios pueden relacionarse con incidencias o peticiones gestionadas en Jira Service Management. Para la incorporación de módulos se recomienda compilar los componentes afectados y documentar las pruebas realizadas y las pendientes.

## Licencia

El archivo [`LICENSE`](LICENSE) contiene los términos de la **GNU General Public License v3.0**. Su adopción para la totalidad del proyecto debe ser confirmada por los titulares de derechos del código y el equipo responsable del repositorio.
