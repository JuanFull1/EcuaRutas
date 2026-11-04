# Frecuencias administrativas

Entrada standalone: `FrecuenciasLista`, preparada para una ruta administrativa
del Commit 4. Este módulo no registra rutas, menús ni guards.

## API y permisos

- GET/POST `/api/frecuencias`; GET/PUT/DELETE `/api/frecuencias/{id}`.
- El servicio permite los filtros reales `cooperativaId` y `rutaId` del GET.
  La pantalla consulta el listado completo y filtra/pagina localmente.
- Reutiliza `API_URL`, `HttpClient`, el interceptor JWT y `AuthService`.
- Todas las operaciones del controlador requieren ADMIN, también las consultas.
- DELETE es baja lógica. PUT conserva el estado original; no ofrece reactivación.
- El backend comprueba unicidad `(cooperativaId, rutaId, horaSalida)`, incluidas
  inactivas. El código no es único. Los conflictos 409 se muestran literalmente.
- No se modifican viajes, hojas de ruta, tarifas ni referencias operativas.

## Catálogos y referencias

Reutiliza `UsuariosAdminService.listarCooperativas()` (`/api/usuarios/cooperativas`,
solo cooperativas activas), `RutaService.listar()` (`/api/rutas`) y
`ResolucionAntService.listar()` (`/api/resoluciones-ant`, del Commit 1).
**Dependencia pendiente:** esta rama contiene `RutaService` y el modelo frontend
de rutas, pero no contiene un controlador backend que exponga `/api/rutas`.
El catálogo requiere integrar el PR correspondiente de rutas. No se inventó un
endpoint alternativo ni se modificó el backend. Si responde 404, el listado
conserva las frecuencias con sus identificadores y se bloquea registrar nuevas
frecuencias hasta disponer del catálogo. La edición descriptiva de referencias
originales y la baja lógica siguen disponibles.

No hay relación directa entre ruta y cooperativa: cambiar cooperativa nunca
borra la ruta. Solo limpia una resolución incompatible con la nueva cooperativa.

El alta exige referencias activas. En edición se conserva la resolución histórica
original aunque esté inactiva. Cambios de código sin cambios estructurales pueden
conservar referencias desactivadas posteriormente. Cambiar estructura de una
frecuencia activa exige referencias activas, como `FrecuenciaService` del backend.
Una frecuencia inactiva puede conservar referencias inactivas al editarse.

Los catálogos se consultan independientemente: un fallo no oculta las frecuencias
y se muestran identificadores cuando falta un nombre. Ante un fallo de catálogo
se puede editar el código conservando la estructura original; se bloquean altas y
cambios estructurales hasta reintentar. El catálogo limitado de cooperativas no
permite seleccionar otras cooperativas inactivas, pero preserva la original.
El backend verifica de nuevo existencia, pertenencia y restricciones operativas.

## Horarios

`horaSalida` se transporta como cadena TimeOnly, sin `Date` ni zonas horarias.
El input usa `HH:mm`; `00:00` es válido y en creación se envía `00:00:00`.
Al editar sin cambiar el valor del input se conserva el TimeOnly original,
incluidos segundos y siete decimales. Al cambiarlo se envía `HH:mm:00`.
La tabla y el detalle muestran el horario completo. Código null y cadena vacía
se conservan, al igual que `activa: false`.

## Verificación

Desde `frontend/`:

```sh
npm test -- --watch=false --include=src/app/admin/frecuencias/*.spec.ts
npm test -- --watch=false
npm run build
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.spec.json
node node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js --noEmit -p tsconfig.app.json
```

Las pruebas usan Vitest/JSDOM y `HttpTestingController`, no una conexión real al
backend. JSDOM simula el diálogo modal. Queda pendiente la integración de ruta y
layout del Commit 4 y una prueba integral con backend y sesión ADMIN reales.

Se revisaron listado, formulario y confirmación en Chrome headless a 1440, 768 y
390 píxeles con una vista temporal y datos simulados fuera del repositorio.
No se detectaron errores de ejecución ni desbordamiento horizontal de la página.
El servidor temporal y el navegador se cerraron tras la revisión.

La suite global conserva 18 fallos existentes en `app.spec.ts` y
`admin/admin-navegacion.spec.ts`: título de ejemplo `Hello, frontend`, expectativas
antiguas del menú, solicitudes HTTP del inicio de cooperativas y fallos derivados
de limpieza de TestBed. No se modificaron esos archivos ajenos al módulo.
El build mantiene advertencias de presupuesto inicial y estilos de ventas,
además de `DecimalPipe` sin uso en `GestionVentas`.
