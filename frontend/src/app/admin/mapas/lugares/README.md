# Visualizador de lugares

`LugaresMapa` (`app-lugares-mapa`) es una pantalla standalone de consulta. Importa
el `Mapa` existente y consume la instancia emitida por `mapaListo`. No crea otro
mapa ni altera `shared/maps`. Está integrado en `/admin/mapas/lugares` y admite
`?lugarId=ID`. Consulta los detalles de navegación en [la integración](../README.md).

## Datos y comportamiento

- Consulta exclusivamente `LugarService.listar()` (`GET /api/lugares`) y reutiliza
  el manejo de errores existente. No realiza escrituras ni agrega endpoints.
- Usa el contrato `LugarDto`: ID, nombre, provincia, cantón, tipo, ubicación y
  estado. La ubicación REST es `{ longitud, latitud }` o `null`.
- `coordenadasMapa` acepta solo números finitos en los rangos longitud ±180 y
  latitud ±90, y devuelve `[longitud, latitud]`. No convierte texto ni reemplaza
  datos faltantes por coordenadas. Cero es una coordenada válida.
- La búsqueda y el filtro de estado actúan en memoria sobre la misma lista que
  alimenta el mapa. Los lugares sin ubicación o con coordenadas inválidas siguen
  en la lista y se identifican como tales. Los IDs repetidos se deduplican.
- La selección desde la lista centra suavemente solo si hay coordenadas. La
  selección desde un marcador no provoca otra operación de cámara ni reconstruye
  los marcadores. Ambas actualizan el panel y el popup.
- Al filtrar se borra una selección que deja de ser visible. Al recargar se
  conserva su ID si sigue en los resultados y se actualizan sus datos y popup.
- La primera carga georreferenciada ajusta la vista una vez. Después, el usuario
  puede pulsar **Mostrar todos los puntos**; los filtros y recargas no sobrescriben
  continuamente la cámara. Sin puntos no se construyen límites ficticios.

## Recursos y seguridad

`MarcadoresLugares` posee únicamente sus marcadores, sus listeners y un popup.
Retira los anteriores antes de actualizar el conjunto; los listeners de los
botones se eliminan antes de retirar los marcadores. Se limpia tanto al destruir
la pantalla como al recibir `remove` del mapa propietario. Nunca invoca
`map.remove()`: esa responsabilidad sigue en `app-mapa`.

Los marcadores son botones con etiquetas accesibles y selección `aria-pressed`.
Se distinguen activos, inactivos y seleccionados mediante colores Bootstrap.
Los popups usan `setDOMContent` y nodos con `textContent`; ningún dato recibido se
inserta como HTML. Se conserva el control de atribución y los créditos del mapa
reutilizable.

La fuente de desarrollo y el worker siguen siendo los definidos en
[`shared/maps/README.md`](../../../shared/maps/README.md). El mapa de demostración
no ofrece detalle vial ni constituye una elección aprobada para producción.

## Pruebas automatizadas

Desde `frontend`:

```powershell
npm test -- --watch=false --include=src/app/admin/mapas/lugares/**/*.spec.ts
npx --no-install tsc -p tsconfig.app.json --noEmit
npx --no-install tsc -p tsconfig.spec.json --noEmit
npm run build
```

Los dos archivos `*.spec.ts` cubren coordenadas, respuestas inesperadas, gestión
de recursos, selección, popups seguros, límites de cámara, filtros, errores y
recargas. Usan HTTP y MapLibre simulados; compilan e incluyen la pantalla aunque
todavía no esté registrada en `app.routes.ts`.

## Comprobación con navegador real

Se incluye una entrada aislada `lugares-mapa.browser.ts`, exclusiva de pruebas,
y un ejecutor Node sin dependencias adicionales. La entrada sustituye
`LugarService` por tres registros simulados, indicándolo con un aviso visible.
No es una respuesta alternativa de la pantalla de producción y nunca se importa
desde `app.routes.ts` ni desde `main.ts`.

Desde `frontend`, con Chrome o Edge instalado:

```powershell
node src/app/admin/mapas/lugares/lugares-mapa.browser.mjs
```

El ejecutor compila esa entrada en modo desarrollo con opciones de línea de
comandos, sirve el resultado solo en `127.0.0.1` y abre Chrome/Edge headless con
perfil aislado. Puede indicarse otro ejecutable mediante `ECUARUTAS_BROWSER`.
Usa WebGL real por software (SwiftShader), el worker y la cartografía pública
configurados, y valida dos marcadores, selección desde lista y mapa, popups,
ajuste de cámara y ausencia de desbordamiento horizontal a 1440 y 390 px.

Guarda `resultado.json`, `escritorio.png` y `movil.png` dentro de
`frontend/dist/mapa-lugares-browser/`, junto al perfil aislado de la prueba.
El resultado no verifica el backend del PR 2 ni GPU física; requiere conexión a
los servicios públicos del mapa. No modifica rutas, configuración Angular ni el
perfil personal del navegador.
