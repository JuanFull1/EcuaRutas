# EcuaRutas — Bugfix backend del dashboard COOPERATIVA

Fecha: 2026-11-04. Alcance: Commit 1, sin crear commit.

## A. Diagnóstico y matriz de propiedad

Verificación inicial: rama `bugfix/modulos-dashboard-cooperativa`, directorio limpio y HEAD `0ef0094`, igual a `develop`. Los seis controladores, servicios e interfaces existen. Los mapas consumen los tres catálogos geográficos; no tienen entidades con propiedad independiente.

Se revisaron JWT, login, `/api/auth/me`, validación de cooperativa en UsuariosService, configuración de autorización, controladores, servicios, interfaces, modelos, DbContext, DTOs, validadores y `database/EcuaRutas.sql` (tablas desde la línea 136). JWT emite `ClaimTypes.NameIdentifier`, `ClaimTypes.Role` y `cooperativa_id` cuando el usuario tiene cooperativa. La autenticación valida firma, emisor, audiencia y vigencia. No se encontró una abstracción reutilizable de contexto autenticado para estos catálogos.

| Entidad | Tiene CooperativaId | Es compartida | Requiere aislamiento | Permisos COOPERATIVA |
|---|---|---|---|---|
| Lugar (`Lugare`) | No | Sí | No hay propiedad verificable | Consulta pública; escritura solo ADMIN |
| Ruta | No | Sí | No hay propiedad verificable | Consulta pública; escritura solo ADMIN |
| RutaParada | No; tiene RutaId | Sí, mediante ruta compartida | No hay propiedad verificable | Consulta pública; escritura solo ADMIN |
| ResolucionesAnt | Sí | No | Directo | Listar, consultar, crear, editar y desactivar propias |
| Frecuencia | Sí | No | Directo; resolución de la misma cooperativa | Listar, consultar, crear, editar y desactivar propias |
| TarifaFrecuencia (`TarifasFrecuencium`) | No; tiene FrecuenciaId | No | Tarifa → Frecuencia → Cooperativa | Listar, consultar, crear, editar y desactivar propias |

La existencia de frecuencias de una cooperativa en una ruta no convierte esa ruta en propiedad exclusiva. Se conservan las consultas públicas existentes para mapas y otros consumidores. No se habilitan escrituras geográficas globales a COOPERATIVA: falta una política explícita de administración compartida.

## B. Archivos modificados y finalidad

Rutas relativas a la raíz del repositorio:

| Archivo | Finalidad |
|---|---|
| `backend/EcuaRutas.Api/Security/CatalogosCooperativaAttribute.cs` | Nuevo filtro exclusivo de los catálogos privados; valida rol y claim, establece y restaura alcance por ejecución asíncrona. |
| `backend/EcuaRutas.Api/Controllers/ResolucionesAntController.cs` | Admite ADMIN/COOPERATIVA con filtro de alcance; convierte rechazo de cooperativa del DTO en 403. |
| `backend/EcuaRutas.Api/Controllers/FrecuenciasController.cs` | Admite ADMIN/COOPERATIVA con filtro de alcance; convierte rechazo de cooperativa del DTO en 403. |
| `backend/EcuaRutas.Api/Controllers/TarifasFrecuenciaController.cs` | Admite ADMIN/COOPERATIVA con filtro de alcance; conserva comprobación contextual frecuencia/tarifa. |
| `backend/EcuaRutas.Api/Services/ResolucionAntService.cs` | Filtra lecturas en SQL; comprueba propietario del DTO y recurso bloqueado antes de escribir. |
| `backend/EcuaRutas.Api/Services/FrecuenciaService.cs` | Filtra lecturas en SQL; comprueba propietario del DTO/recurso y visibilidad de la resolución bajo bloqueo. |
| `backend/EcuaRutas.Api/Services/TarifaFrecuenciaService.cs` | Filtra mediante la frecuencia; comprueba propiedad del padre bajo bloqueo compartido antes de escribir. |
| `backend/EcuaRutas.Api.Tests/Controllers/AlcanceCatalogosTests.cs` | Nuevos casos de autenticación, rol y claims inválidos, ausentes o duplicados; helper para ejecutar el filtro real en pruebas de servicios. |
| `backend/EcuaRutas.Api.Tests/Controllers/CatalogosAutorizacionHttpTests.cs` | Nuevo servidor Kestrel aislado con JWT, MVC, controladores y filtros reales; servicios simulados. |
| `backend/EcuaRutas.Api.Tests/Controllers/CatalogosHttpTests.cs` | Actualiza matriz de permisos y token COOPERATIVA del fixture que arranca Program real. |
| `backend/EcuaRutas.Api.Tests/Controllers/ResolucionesAntControllerTests.cs` | Comprueba traducción del rechazo de propiedad a 403. |
| `backend/EcuaRutas.Api.Tests/Controllers/FrecuenciasControllerTests.cs` | Comprueba traducción del rechazo de propiedad a 403. |
| `backend/EcuaRutas.Api.Tests/Services/ResolucionAntServiceTests.cs` | Propiedad, CRUD propio, ataques por DTO/ID, alcance concurrente y restauración tras excepción; adapta doble de consultas. |
| `backend/EcuaRutas.Api.Tests/Services/FrecuenciaServiceTests.cs` | Propiedad, filtros explícitos ajenos, CRUD propio, resolución ajena y preservación de ADMIN; adapta doble de consultas. |
| `backend/EcuaRutas.Api.Tests/Services/TarifaFrecuenciaServiceTests.cs` | Propiedad transitiva, CRUD propio, ataques ajenos, validación de precios/tramos; adapta doble de consultas. |
| `backend/EcuaRutas.Api.Tests/INFORME-BUGFIX-COOPERATIVA.md` | Este informe. |

No se cambiaron interfaces, contratos REST, DTOs, entidades, relaciones, SQL, migraciones, Program, autenticación global, frontend ni módulos operativos.

## C. Autorización aplicada

- ADMIN conserva acceso global y las validaciones de negocio existentes. No requiere `cooperativa_id` para estos endpoints.
- COOPERATIVA necesita exactamente un claim `cooperativa_id` entero positivo válido. Claims ausentes, duplicados, inválidos o fuera de rango reciben 403.
- Anónimos reciben 401 en los catálogos privados; CLIENTE, OFICINISTA y otros roles no autorizados reciben 403. Las consultas geográficas conservan acceso público.
- Listados privados se filtran en la consulta EF. El filtro `cooperativaId` de frecuencias se combina con el alcance autenticado; no puede ampliarlo. Un filtro hacia otra cooperativa devuelve lista vacía.
- Detalles, bajas y ediciones de recursos ajenos se tratan como no visibles: 404. Un `CooperativaId` ajeno en un DTO de alta/edición recibe 403 sin mensaje privado. En una edición que combina ID ajeno y DTO ajeno puede prevalecer este 403.
- La resolución ANT utilizada por una frecuencia debe ser visible y pertenecer a la cooperativa. Una resolución ajena recibe 404 sin exponer sus datos. ADMIN conserva la validación anterior de coherencia, con 409 cuando corresponda.
- La tarifa comprueba propiedad mediante la frecuencia, tanto en consulta como al escribir. La URL sigue exigiendo que la tarifa pertenezca a la frecuencia indicada; el cuerpo no puede cambiar FrecuenciaId.
- Datos inválidos conservan 400; conflictos de negocio conservan 409. No se modificaron duplicados, horarios, bajas lógicas, estado de referencias, precios, precisión, orden/paradas ni protecciones de viajes/hojas de ruta/ventas.

El filtro se aplica solo a los tres controladores privados. `AsyncLocal` transmite el alcance durante la acción y lo restaura en `finally`; no requiere dependencias ni registros en Program. Los servicios internos sin este filtro mantienen el alcance global previo. Todo futuro endpoint que exponga estos servicios deberá aplicar el mismo filtro y autorización; no se trata de un filtro global de EF.

Las escrituras verifican propiedad después de adquirir/refrescar el recurso bloqueado. En tarifas también se bloquea la frecuencia con `FOR SHARE`, manteniendo estable su propietario hasta finalizar la transacción. No se autorizan escrituras mediante una comprobación previa aislada en el controlador.

## D. Pruebas ejecutadas

Comando obligatorio:

```powershell
dotnet test backend/EcuaRutas.Api.Tests/EcuaRutas.Api.Tests.csproj
```

Resultado: no llega a ejecutar pruebas por los errores preexistentes de Program descritos en E. No equivale a una suite aprobada ni a casos fallidos de xUnit.

Para verificar lo posible se generó un proyecto temporal con las mismas referencias de paquetes y los fuentes reales de API/pruebas, excluyendo únicamente `Program.cs` de compilación. Se compilaron también las pruebas HTTP originales, pero se excluyeron de ejecución porque necesitan el entry point real de Program. No se alteró ni se sustituyó Program en el repositorio.

Comando ejecutado en ese arnés:

```powershell
dotnet test backend/EcuaRutas.Api.Tests/.verification/Cooperativa.Tests.csproj --filter 'FullyQualifiedName!~CatalogosHttpTests' --logger 'trx;LogFileName=cooperativa.trx'
```

El arnés y los resultados quedaron conservados localmente bajo `backend/EcuaRutas.Api.Tests/obj/VerificacionCooperativa/` (ignorado por Git), sin archivos temporales pendientes de incorporar. Para repetirlo en este directorio de trabajo:

```powershell
dotnet test backend/EcuaRutas.Api.Tests/obj/VerificacionCooperativa/Cooperativa.Tests.csproj --filter 'FullyQualifiedName!~CatalogosHttpTests' --logger 'trx;LogFileName=cooperativa.trx'
```

| Grupo | Aprobadas |
|---|---:|
| Filtro de alcance | 9 |
| HTTP en servidor aislado | 123 |
| Controladores: resoluciones, frecuencias y tarifas | 29 |
| DTOs | 203 |
| Servicios: resoluciones, frecuencias y tarifas | 142 |
| Validadores de frecuencias y tarifas | 53 |
| **Total ejecutado** | **559** |

Resultado final del arnés: **559 aprobadas, 0 fallidas, 0 omitidas**. Los **110 casos** de `CatalogosHttpTests` quedaron excluidos del arnés, pendientes de ejecutar con Program compilable; no forman parte del contador de omitidas de xUnit.

Cobertura nueva: 401/403 para roles y claims; CRUD propio; detalle y escrituras ajenas; manipulación del DTO; filtro de listado ajeno; resolución ajena en creación/edición; propiedad transitiva de tarifas; validaciones de precio/tramos; consultas geográficas públicas y escrituras denegadas; alcance entre solicitudes concurrentes y tras excepciones; preservación de ADMIN. Las demás pruebas existentes verifican duplicados, horarios, bajas lógicas y referencias históricas.

Las 123 pruebas HTTP usan Kestrel y middleware JWT/MVC reales en un servidor de prueba independiente, con servicios dobles. No verifican los registros DI ni el arranque de Program de producción. Las pruebas de servicios interceptan consultas Npgsql y simulan persistencia/transacciones: **no son pruebas reales de PostgreSQL**. No se abrió una base compartida ni se realizaron operaciones destructivas. Quedan pendientes FK, restricciones, bloqueos, carreras, rollback y deadlocks en PostgreSQL aislado, además de la suite que arranca Program real.

## E. Compilación

```powershell
dotnet build backend/EcuaRutas.Api/EcuaRutas.Api.csproj
```

Resultado: fallida, **2 errores y 1 advertencia**, todos en archivos fuera de este cambio:

- `Program.cs:124`: CS0246, no existe `IVentasService`.
- `Program.cs:123`: CS0311, `VentasService` no implementa ese contrato del registro DI.
- `Services/ReservasClienteService.cs:117`: CS8602, posible desreferencia nula.

El arnés compila los fuentes modificados y las pruebas sin errores; conserva la advertencia CS8602 anterior. No se corrigieron esos problemas de integración ni se recuperó el stash.

## F. Seguridad y pendientes

Se corrigen los riesgos de acceso horizontal que habría producido ampliar solamente los roles: listados globales, lectura/escritura por IDs ajenos, suplantación por CooperativaId del JSON, asociación de resoluciones ajenas y acceso a tarifas sin verificar el propietario de la frecuencia.

Los catálogos geográficos siguen siendo compartidos. Falta decidir quién puede proponer o administrar cambios compartidos desde COOPERATIVA; sus escrituras permanecen restringidas a ADMIN. No se inventó propiedad a partir de las frecuencias.

El alcance de autorización utiliza los claims del JWT validado y no cambia su política de vigencia/revocación. Los consumidores internos globales y otros módulos no fueron auditados ni modificados como parte de este commit. Debe ejecutarse la integración completa después de resolver el bloqueo preexistente y verificarse la concurrencia en PostgreSQL aislado.

## G. Git

- Rama conservada: `bugfix/modulos-dashboard-cooperativa`.
- Base y HEAD inicial: `0ef0094`, igual a `develop`.
- Los 16 archivos nuevos/modificados están enumerados en B; no se prepararon para commit.
- `git diff --check`: sin errores.
- Stash conservado: `stash@{0}: On develop: WIP correcciones de integracion post-merge`.
- Referencia `refs/stash` verificada antes y después: `02daa8b235ee0b97fa629118026f7d75adc0ded9`.
- Solo se realizaron operaciones Git de lectura. No hubo add, commit, push, pull, merge, rebase, switch, creación de ramas/PR ni recuperación/modificación del stash.

## H. Estado final

COOPERATIVA tiene habilitado CRUD con baja lógica de sus resoluciones ANT, frecuencias y tarifas. Puede consultar lugares, rutas y paradas para los dos mapas mediante los contratos existentes. ADMIN conserva la administración global.

Las escrituras geográficas requieren una decisión funcional de administración compartida. La compilación y el arranque completo siguen bloqueados por IVentasService. No se inició Commit 2 ni se modificó frontend o cartografía. Trabajo detenido para revisión del usuario.
