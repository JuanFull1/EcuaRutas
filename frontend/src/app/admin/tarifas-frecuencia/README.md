# Tarifas por frecuencia y tramo

Entrada standalone: `TarifasFrecuenciaLista`, integrada desde el Commit 4 en
`/admin/tarifas` con el layout existente, carga diferida y guards para ADMIN.
El módulo reutiliza los servicios de frecuencias y catálogos sin modificarlos.

## Contratos y dependencias

- GET/POST `/api/frecuencias/{frecuenciaId}/tarifas`.
- GET/PUT/DELETE `/api/frecuencias/{frecuenciaId}/tarifas/{id}`.
- La frecuencia está en la URL, nunca se añade al DTO de escritura. El cuerpo
  contiene `origenRutaParadaId`, `destinoRutaParadaId`, `precioBase` y, solo al
  actualizar, `activa`. No se permite cambiar la frecuencia de una tarifa.
- Todas las operaciones requieren ADMIN, también las consultas. Se reutilizan
  `API_URL`, `HttpClient`, el interceptor JWT y `AuthService` existentes.
- Unicidad de frecuencia/origen/destino, incluidas inactivas, garantizada por el
  backend. La interfaz muestra el 409 recibido y no promete unicidad concurrente.
- DELETE desactiva; conserva el registro y no cambia frecuencia, paradas, ventas
  ni boletos. PUT conserva el estado original, sin ofrecer reactivación.

Se reutiliza `FrecuenciaService` del Commit 2. Al seleccionar se consulta la
frecuencia actual por ID y se usa su `rutaId` real; cambiar de selección cancela
las lecturas pendientes y descarta datos del contexto anterior. Durante formularios
y confirmaciones se bloquea el selector para no cambiar el contexto de escritura.

Se reutilizan los contratos frontend existentes:

- `RutaParadaService.listar(rutaId)`: `/api/rutas/{rutaId}/paradas`.
- `RutaService.listar()`: `/api/rutas`.
- `LugarService.listar()`: `/api/lugares`.
- `UsuariosAdminService.listarCooperativas()`: `/api/usuarios/cooperativas`.

**Dependencia pendiente:** en esta rama no están los controladores backend de
rutas, paradas ni lugares. Estos endpoints dependen de integrar el PR respectivo;
no se inventan alternativas ni datos. Si no se pueden obtener paradas, se bloquean
registro y edición, pero se conservan consulta y baja lógica de tarifas existentes.
Un fallo de nombres no bloquea operaciones si las paradas reales están disponibles.
En ausencia de nombres se muestran identificadores reales. Cooperativas ofrece
solo las activas y puede faltar el nombre de una cooperativa histórica.

## Tramos y precio

Los extremos son IDs de `RutaParada`, distintos de `lugarId`. Solo se admiten
paradas de la ruta seleccionada, ordenadas por `orden`. Se exige
`ordenOrigen < ordenDestino`, nunca una comparación entre IDs para validar tramo.
Cambiar el origen conserva un destino compatible y limpia uno incompatible.

El precio se captura como texto decimal (coma o punto) y se valida antes de
convertirlo: de 0 a 99.999.999,99, máximo dos decimales. Se rechazan exponentes,
negativos y precisión excesiva, sin redondeo. La validación usa centavos BigInt;
solo un valor válido se convierte al número JSON exigido por el DTO. El formulario
de edición conserva precio, frecuencia y `activa: false`.

Las reglas de frecuencia inactiva siguen al backend: no admite altas, y cambiar
una tarifa activa requiere frecuencia activa; las tarifas inactivas pueden editarse
manteniendo su estado. No se recalcula el precio de operaciones históricas.

## Verificación

Desde `frontend/`:

```sh
npm test -- --watch=false --include=src/app/admin/tarifas-frecuencia/*.spec.ts
npm test -- --watch=false
npm run build
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.spec.json
node node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js --noEmit -p tsconfig.app.json
```

Pruebas Vitest/JSDOM con `HttpTestingController`, sin conexiones reales al backend.
La simulación del diálogo en JSDOM no sustituye la revisión de navegador.
Resultado del Commit 3: 95 pruebas del módulo aprobadas. Suite global entonces: 466 aprobadas y 18
fallos existentes en `app.spec.ts` y `admin/admin-navegacion.spec.ts` (título de
ejemplo, expectativas del menú y solicitudes HTTP pendientes del inicio de
cooperativas, con fallos derivados de limpieza de TestBed). No se modifican esos
archivos ajenos al alcance.

Build y verificaciones TypeScript/plantillas sin errores. Persisten las advertencias
conocidas de `DecimalPipe` en ventas, presupuesto inicial y estilos de ventas.
Desde el Commit 4 el módulo entra como chunk diferido en el build de producción.
Se compila además mediante pruebas y `ngc --noEmit` para verificar sus plantillas.

Revisión visual en Chrome headless a 1440, 768 y 390 píxeles: listado, formulario
y confirmación sin errores de ejecución ni desbordamiento horizontal de página.
Se usó una vista temporal con datos simulados fuera del repositorio; navegador
y servidor se cerraron después de la revisión.

En el Commit 4 las pruebas de navegación anteriores y las nuevas pasan; la suite
global conserva únicamente el fallo previo del título de `App`. Las tres rutas
se verifican dentro del layout y con JWT mediante una API simulada.
Queda pendiente integrar los endpoints backend de catálogo y ejecutar una prueba
integral con backend y sesión ADMIN reales.

Verificación final del Commit 4: 80 pruebas de navegación aprobadas (35 nuevas y
45 existentes actualizadas). Suite completa: 518 aprobadas, 1 fallida y 0 omitidas.
La única fallida sigue esperando `Hello, frontend` en `app.spec.ts` y queda fuera
de las correcciones de navegación. El build de producción es correcto y conserva
las advertencias conocidas de presupuesto y ventas.

Las tres pantallas se revisaron dentro del `App`, router y layout reales en
Chrome a 1440, 768 y 390 píxeles: 27 combinaciones de pantalla/estado/tamaño y
6 comprobaciones del sidebar en tablet/móvil. Sin desbordamiento horizontal de
página ni errores de ejecución. La vista temporal reutilizó autenticación e
interceptor con API simulada; no se enviaron solicitudes al backend real ni se
escribieron datos PostgreSQL. El navegador y el servidor temporal se cerraron.
