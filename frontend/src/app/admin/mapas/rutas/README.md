# Mapa de rutas y paradas

`RutasMapa` (`app-rutas-mapa`) es standalone y exclusivamente de consulta. Reutiliza
`app-mapa` mediante `mapaListo`, `RutaService`, `LugarService`, `RutaParadaService`
y las funciones `coordenadasMapa` y `leerLugares` del visualizador de lugares.
No modifica esos módulos ni incorpora otra inicialización de MapLibre.

## Contratos verificados

Los DTOs actuales y los servicios de `feature/rutas-paradas-api` no exponen
geometría de carretera. `RutaDto` contiene identificadores de origen/destino;
`RutaParadaDto` contiene `lugarId`, `orden`, acumulados y permisos. Las coordenadas
se resuelven desde `LugarDto.ubicacion`, siempre en orden `[longitud, latitud]`.

Solo se consumen GET `/api/rutas`, GET `/api/lugares` y
GET `/api/rutas/{rutaId}/paradas`, mediante los servicios existentes y su
configuración HTTP/JWT. Los GET públicos no convierten esta pantalla en una ruta
pública: su conexión al área administrativa queda para el Commit 4.

## Secuencia y trazado referencial

La lista conserva por separado origen, cada parada ordenada numéricamente por
`orden`, y destino. No altera los órdenes, los IDs ni los acumulados recibidos.
Cero, números negativos permitidos, `null` y booleanos `false` se conservan.

La línea es un GeoJSON `Feature<LineString>` que conecta los puntos disponibles
en esa secuencia. Se omiten coordenadas inválidas y se avisa de ello. Cuando un
extremo es además la primera/última parada, se evita repetirlo consecutivamente
en la línea, conservando ambas funciones en la lista y en el popup.

No se dibuja línea si hay menos de dos coordenadas distintas, órdenes repetidos,
lugares repetidos entre paradas, origen/destino iguales o extremos que contradigan
su posición en el orden registrado. Estos casos muestran avisos y mantienen los
registros para consulta; no se inventa una secuencia alternativa ni se corrige la
base de datos. Una respuesta de paradas de otra ruta se rechaza.

La interfaz identifica permanentemente el **trazado referencial**. La línea no
representa carreteras, no calcula kilómetros viales ni estima tiempos. Solo se
muestran los kilómetros y minutos acumulados que existen en los DTOs.

## Identidad y selección

Las funciones tienen claves independientes: `origen`, `destino`, `parada:{id}`.
Los marcadores se agrupan por `lugarId`: verde para origen, rojo para destino,
azul para paradas (con su orden) y amarillo para selección. Un marcador compartido
ofrece opciones de función en el popup para conservar la identidad y los datos
de cada relación. No se desplazan artificialmente las coordenadas.

La selección desde la lista centra suavemente si hay coordenadas. La selección
desde el mapa o sus opciones actualiza el panel sin iniciar otro movimiento ni
recrear el mapa. Los popups usan `textContent` y `setDOMContent`; nunca insertan
HTML recibido. Sus botones y los marcadores son controles de teclado.

La cámara se ajusta inicialmente una vez por ruta, y después mediante **Mostrar
recorrido completo**, respetando la navegación manual. Las recargas y selecciones
no fuerzan continuamente el encuadre.

## Recursos y solicitudes

`RecursosRecorrido` posee sus marcadores, listeners, popup y una source/layer con
IDs únicos por instancia. Actualiza los datos de su source existente y retira su
layer antes de la source al limpiar. Verifica identidad antes de eliminar un
recurso para conservar fuentes y capas ajenas.

Antes del estilo listo no añade recursos. En `style.load` restaura únicamente su
línea con los últimos datos; este evento habilita la creación aunque
`isStyleLoaded()` espere todavía datos de las fuentes. No duplica marcadores ni
listeners al cambiar de estilo.

Al cambiar de ruta se cancela la consulta anterior antes de activar la siguiente,
se limpian inmediatamente selección y recursos, y se comprueba el `rutaId` de la
respuesta. `takeUntilDestroyed` cancela solicitudes al destruir. Tanto el cierre
de la pantalla como el evento `remove` del mapa liberan los recursos propios.
`app-mapa` sigue siendo el único responsable de destruir la instancia MapLibre.

## Pruebas

Desde `frontend`:

```powershell
npm test -- --watch=false --include=src/app/admin/mapas/rutas/**/*.spec.ts
npm test -- --watch=false --include=src/app/admin/mapas/**/*.spec.ts --include=src/app/shared/maps/**/*.spec.ts
npx --no-install tsc -p tsconfig.app.json --noEmit
npx --no-install tsc -p tsconfig.spec.json --noEmit
npm run build
```

Los tests incluyen la pantalla aunque no esté registrada en `app.routes.ts` y
comprueban geometría, DTOs, recursos, estilos, selección, cambios A-B-A, errores,
estados vacíos, valores nulos y limpieza. No necesitan backend ni WebGL en JSDOM.

## Navegador real

```powershell
node src/app/admin/mapas/rutas/rutas-mapa.browser.mjs
```

El ejecutor utiliza Node y Chrome/Edge ya instalados (o `ECUARUTAS_BROWSER`) sin
instalar dependencias. Compila una entrada aislada en modo desarrollo, sirve solo
en `127.0.0.1` y utiliza un perfil propio y headless. No modifica navegación,
configuración Angular ni el perfil personal.

`rutas-mapa.browser.ts` aporta rutas, lugares y paradas **simulados** e identifica
la prueba con un aviso visible. MapLibre, WebGL por software (SwiftShader), el
worker y la cartografía son reales. Se verifican marcadores, funciones compartidas,
selección, datos de la source/layer, restauración tras `setStyle`, encuadre, ausencia
de desbordamiento a 1440/390 px y desmontaje. Las capturas son del viewport para
evitar recortes de superficies WebGL al capturar una página completa en headless.

Se guardan `resultado.json`, `escritorio.png`, `movil.png` y el perfil de pruebas
en `frontend/dist/mapa-rutas-browser/`. El ejecutor examina la instancia mediante
las herramientas de depuración de Angular exclusivamente en esa entrada de prueba.
La entrada no se importa desde `main.ts` ni desde las rutas de producción.

Estas pruebas no verifican PostgreSQL, la API real ni una GPU física. La integración
contra el backend del PR 2 queda pendiente. La fuente de demostración y el worker
conservan las condiciones y limitaciones descritas en
[`shared/maps/README.md`](../../../shared/maps/README.md). No constituyen una
elección de cartografía vial aprobada para producción.
