# Resoluciones ANT

Componente standalone de entrada: `ResolucionesAntLista` (`resoluciones-ant-lista.ts`).
Usa los estilos Bootstrap globales y el `HttpClient`/interceptor JWT ya configurados.
Desde el Commit 4 se integra en `/admin/resoluciones-ant`, bajo el layout existente,
con enlace administrativo, carga diferida y guards `authGuard`/`roleGuard` para ADMIN.

## Contratos

- GET/POST `/api/resoluciones-ant`; GET/PUT/DELETE `/api/resoluciones-ant/{id}`.
- Todas las operaciones requieren ADMIN, también las consultas.
- DELETE desactiva y conserva el registro; la edición conserva `activa` sin ofrecer reactivación.
- Fechas `DateOnly` como cadenas `YYYY-MM-DD`, sin conversiones de zona horaria.
- Se conservan el número literal, `archivoUrl: null`, URL vacía y estado `false`.
- Las direcciones de documento solo se convierten en enlaces para HTTP/HTTPS;
  no se añade validación de URL al contrato de guardado.

## Cooperativas

Se reutilizan `UsuariosAdminService.listarCooperativas()` y `CooperativaResumen`
del proyecto. Su endpoint `/api/usuarios/cooperativas` devuelve solo cooperativas
activas. No hay catálogo administrativo completo de cooperativas en esta rama.

El listado usa el nombre disponible o el identificador como respaldo. Al editar,
se permite conservar la cooperativa original aunque no figure en el catálogo.
La creación y la selección de otra cooperativa usan las opciones disponibles.
El backend decide existencia y conflictos por referencias. Un fallo del catálogo
no oculta resoluciones y se puede reintentar por separado.

## Verificación

Pruebas con Vitest/JSDOM y `HttpTestingController`: no representan una prueba
integral contra ASP.NET/PostgreSQL.
JSDOM simula `showModal`/`close` del diálogo de confirmación.
La tabla usa desplazamiento horizontal; formularios y acciones usan la grilla
responsive de Bootstrap.

Se revisaron listado, formulario y confirmación en Chrome headless a 1440, 768 y
390 píxeles, con una vista temporal y datos simulados fuera del repositorio.
No se detectaron errores de ejecución ni desbordamiento horizontal de la página.
El servidor y el navegador temporales se cerraron después de la revisión.

Comandos del módulo (desde `frontend/`):

```sh
npm test -- --watch=false --include=src/app/admin/resoluciones-ant/*.spec.ts
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.spec.json
node node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js --noEmit -p tsconfig.app.json
npm run build
```

En la verificación del Commit 1 la suite global presentaba 18 fallos en `app.spec.ts` y
`admin/admin-navegacion.spec.ts`, reproducidos ejecutando solo esos archivos sin
las pruebas nuevas. El primero espera el título de ejemplo `Hello, frontend`;
las pruebas de navegación no contemplan consultas del inicio de cooperativas
ni sus enlaces de viajes, y después acumulan fallos de limpieza de TestBed.
No se modificaron esos archivos por estar fuera del alcance del Commit 1.

El Commit 4 actualiza las pruebas de navegación y deja solo el fallo preexistente
del título de ejemplo en `app.spec.ts`. La integración de ruta/layout se prueba
con el router, guards, autenticación e interceptor reales y HTTP simulado.
Queda pendiente una prueba integral con sesión ADMIN y backend real.
