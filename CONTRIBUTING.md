# Guía de contribución — EcuaRutas

Este documento establece las prácticas de colaboración para mantener un desarrollo ordenado, verificable y respetuoso entre los participantes del proyecto EcuaRutas.

## Flujo de ramas

Se utiliza un flujo basado en GitFlow:

| Rama | Propósito |
| --- | --- |
| `main` | Versiones estables del proyecto. |
| `develop` | Integración de funcionalidades revisadas. |
| `feature/*` | Desarrollo de funcionalidades o mejoras. |
| `docs/*` | Actualización o creación de documentación; parte de `develop` y se integra en `develop`. |
| `bugfix/*` | Corrección de errores encontrados durante el desarrollo; parte de `develop` y se integra en `develop`. |
| `release/*` | Preparación de entregas o versiones, si se requiere. |
| `hotfix/*` | Corrección urgente de una versión publicada; parte de `main` y, tras integrarse en `main`, también se incorpora a `develop`. |

Evita realizar commits directamente en `main` o `develop`. Crea `feature/*`, `docs/*` y `bugfix/*` desde la versión actualizada de `develop`. Usa `hotfix/*` solo para incidentes de producción y créala desde `main`. No uses `bugfix/*` y `hotfix/*` como sinónimos: la primera corrige el trabajo en curso; la segunda corrige una versión estable publicada.

## Procedimiento de trabajo

1. **Sincroniza la base de trabajo:** `git switch develop` y `git pull origin develop`.
2. **Crea la rama según el cambio:** por ejemplo, `git switch -c feature/notificaciones-correo` para una funcionalidad, `git switch -c docs/actualizar-readme` para documentación o `git switch -c bugfix/correccion-reserva` para un error de desarrollo.
3. **Trabaja con cambios acotados:** evita incluir archivos de otros módulos que no estén relacionados.
4. **Realiza commits claros:** cada commit debe expresar una modificación concreta.
5. **Comprueba los cambios:** compila el backend, frontend o herramienta afectada y documenta las pruebas realmente ejecutadas.
6. **Publica tu rama** y abre un Pull Request hacia `develop` para ramas `feature/*`, `docs/*` y `bugfix/*`. Para `hotfix/*`, abre Pull Requests hacia `main` y `develop` para que la corrección no se pierda en el siguiente desarrollo.
7. **Atiende la revisión:** resuelve observaciones, conflictos y advertencias relevantes antes del merge.
8. **Integra mediante revisión:** el merge se realiza de acuerdo con la aprobación y coordinación del equipo.

## Coordinación de módulos y archivos compartidos

La guía del equipo distribuye trabajo entre Juan (usuarios/cooperativas), Damaris (flota), Bryan (rutas/frecuencias), Eve (viajes/operación), Vicky (ventas/boletos) y Tati (pagos/cliente/notificaciones). Cada integrante puede modificar frontend, backend y SQL de su módulo en una misma rama.

**Archivos especialmente compartidos:** `frontend/src/app/app.routes.ts`, `frontend/src/app/shared/layout/`, `frontend/src/styles.css`, `frontend/package.json`, `frontend/package-lock.json`, `backend/EcuaRutas.Api/Program.cs`, `backend/EcuaRutas.Api/EcuaRutas.Api.csproj`, `backend/EcuaRutas.Api/Data/EcuaRutasDbContext.cs` y `database/EcuaRutas.sql`.

- Preferir rutas Angular por módulo y reutilizar el layout compartido.
- Mantener la lógica del backend en servicios, no concentrarla en controladores; compartir un solo DbContext.
- Al modificar `EcuaRutas.sql`, cambiar solo las tablas, restricciones o índices del módulo y documentar el cambio en el PR.
- Evitar scaffolding forzado que sobrescriba modelos de otros integrantes.
- Al resolver conflictos, revisar ambos lados y preservar las funcionalidades compatibles.

## Convención de commits

Se recomienda usar **Conventional Commits**:

```text
feat(cliente): agrega historial de compras
fix(notificaciones): alinea estados SMTP y esquema SQL
test(notificaciones): agrega prueba de envio SMTP
docs(readme): actualiza instrucciones de ejecucion
refactor(ventas): centraliza registro de notificaciones
```

Tipos habituales: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`. Usa `fix` tanto para commits de una rama `bugfix/*` como de una `hotfix/*`; el tipo de commit no reemplaza el propósito de la rama.

## Pull Requests

Cada PR debe incluir:

- **Título claro** que resuma el cambio.
- **Descripción funcional:** qué se añadió o corrigió y qué módulos se ven afectados.
- **Validaciones realizadas:** comandos de compilación y pruebas efectivamente ejecutadas.
- **Pendientes y limitaciones:** pruebas aún no realizadas, cambios de configuración o migraciones requeridas.
- **Evidencias** cuando correspondan: capturas sin datos personales, resultados de pruebas o referencias a incidencias.
- **Archivos y endpoints principales**, cambios SQL, pasos de prueba e Issue de GitHub relacionado, cuando aplique.

No se debe afirmar que una funcionalidad fue probada si solamente compiló.

## Validación técnica sugerida

Desde la raíz del repositorio:

```powershell
dotnet build .\backend\EcuaRutas.Api\EcuaRutas.Api.csproj
cd .\frontend
npm run build
cd ..
```

Si modificas SQL, revisa su compatibilidad con bases ya existentes y proporciona el script de actualización cuando sea necesario. No ejecutes migraciones sobre bases compartidas sin autorización y respaldo.

## Gestión de cambios y revisión

El equipo utiliza GitHub para el historial de código y la revisión mediante Pull Requests. Cuando aplique, las incidencias y solicitudes de cambio se documentan en GitHub Issues y se vinculan con su rama y Pull Request. Según el impacto, se contemplan cambios estándar, normales y de emergencia; la coordinación y aprobación se realizan conforme a los acuerdos del equipo.

La guía propone una rotación de revisión: Juan → Bryan, Bryan → Damaris, Damaris → Tati, Tati → Vicky, Vicky → Eve y Eve → Juan. Esta distribución es orientativa; el responsable real de cada revisión debe acordarse en el PR.

## Seguridad y calidad

- No subas `secrets.json`, `.env` con valores reales, contraseñas, tokens JWT o cadenas de conexión privadas.
- Evita incluir `bin/`, `obj/`, `node_modules/` y otros archivos generados innecesariamente.
- Respeta los límites de autorización por rol y de acceso a información de cada cliente o cooperativa.
- No utilices datos personales reales en evidencias de pruebas.
- Mantén el formato, nombres y convenciones del código existente siempre que sea posible.

Consulta también [SECURITY.md](SECURITY.md) y [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
