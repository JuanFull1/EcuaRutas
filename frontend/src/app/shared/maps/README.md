# Mapa reutilizable

`Mapa` es standalone y utiliza MapLibre GL JS **6.14.0**, ya presente en
`package.json`, `package-lock.json` y `node_modules`. Su CSS ya se importa en
`src/styles.css`; este módulo no agrega dependencias ni modifica estilos globales.

## Uso

Importar `Mapa` en `imports` del componente consumidor:

```html
<app-mapa
  [centro]="[-78.5, -1.5]"
  [zoom]="5"
  etiqueta="Mapa de Ecuador"
  style="--ecuarutas-mapa-altura: 450px"
/>
```

- `centro`: `LngLatLike`, en orden **[longitud, latitud]**. Vista inicial del Ecuador
  continental, sin representar la ubicación de un registro.
- `zoom`: número; inicial `5`. Se conserva expresamente el valor `0`.
- `estilo`: URL de estilo o especificación compatible con `MapOptions['style']`.
  Cambiarlo aplica `setStyle`, sin crear otra instancia del mapa. El estilo debe
  incluir los datos de atribución exigidos por sus fuentes.
- `etiqueta`: nombre accesible de la región; se utiliza también como título del
  mapa en su inicialización.
- `mapaListo`: emite la instancia de MapLibre tras `load`. No retenerla después de
  destruir el componente. Este commit no agrega marcadores ni datos de negocio.
- `falloMapa`: emite la causa original para diagnóstico del consumidor; la interfaz
  muestra un mensaje comprensible sin trazas ni URLs técnicas.
- `redimensionar()`: ajuste explícito opcional. `trackResize: true` de esta versión
  ya utiliza `ResizeObserver` para cambios del contenedor, incluso al mostrarlo
  después de estar oculto. `remove()` desconecta ese observador.

La altura ocupa `--ecuarutas-mapa-altura` (400 px por defecto), con mínimo de
240 px. Puede usarse `100%` cuando el padre tenga una altura definida.

## Inicialización y limpieza

El mapa se crea una sola vez en `ngAfterViewInit`, usando el elemento propio del
componente. Los cambios de centro/zoom actualizan únicamente las propiedades
modificadas mediante `jumpTo`, conservando la otra parte de la cámara.
La interacción se inicia fuera de Angular; los estados y eventos públicos vuelven
a Angular. Al destruir, se retiran los listeners propios y se invoca `remove()`
una sola vez para liberar controles, contexto gráfico, workers y observadores.

## Mapa base OpenStreetMap

`mapa.config.ts` centraliza `ESTILO_MAPA_OSM`: estilo MapLibre v8 con proyección
Mercator, fuente raster XYZ de 256 px y capa `osm-base`. Utiliza el estilo estándar
de OpenStreetMap mediante `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, entre
los niveles 0 y 19. No requiere claves. Se conservan Ecuador como vista inicial,
el ajuste a los datos y el desplazamiento libre fuera del país.

La atribución `© OpenStreetMap contributors` enlaza a
[OpenStreetMap copyright](https://www.openstreetmap.org/copyright). El control
nativo de MapLibre permanece expandido, también en móvil. Se retiraron los créditos
al antiguo mapa político de MapLibre/Natural Earth.

El servidor público se configura para desarrollo y uso interactivo moderado,
según la [política de teselas OSM](https://operations.osmfoundation.org/policies/tiles/).
No ofrece SLA ni capacidad ilimitada. No realizar precargas, descargas masivas,
uso offline ni barridos automatizados de zoom/desplazamiento contra ese servidor.
Se usa la caché HTTP normal del navegador, sin añadir cabeceras que la desactiven,
proxies ni políticas que eliminen Referer. Servir la aplicación mediante HTTP(S),
sin una Referrer-Policy que impida enviar el origen al proveedor.

Antes de producción, evaluar el tráfico y seleccionar un proveedor adecuado o
alojamiento propio. El token `MAPA_ESTILO_BASE` permite sustituir el proveedor en
los providers de la aplicación, sin cambiar cada consumidor:

```ts
{ provide: MAPA_ESTILO_BASE, useValue: '/mapas/proveedor-aprobado.json' }
```

Ese estilo debe declarar sus fuentes, capas y atribuciones. El input `estilo`
sigue permitiendo una sustitución por instancia. No hay fallback automático al mapa
político anterior cuando falla una tesela. Los errores muestran un aviso sin
reconstruir el mapa ni impedir su interacción.

El mapa base no modifica geometrías ni calcula recorridos viales: las capas
GeoJSON de rutas y los marcadores continúan superpuestos con los datos existentes.

## Worker de MapLibre 6

La [guía oficial de migración a v6](https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/)
requiere configurar `setWorkerUrl()` con bundlers. Para que el componente sea
utilizable sin alterar la configuración Angular, `MAPA_WORKER_URL` proporciona
inicialmente el módulo público de jsDelivr fijado en la misma versión instalada:

`https://cdn.jsdelivr.net/npm/maplibre-gl@6.14.0/dist/maplibre-gl-worker.mjs`

También necesita sus imports relativos, incluido `maplibre-gl-shared.mjs`.
Este valor de desarrollo añade una dependencia de red al CDN. Para servir todo
desde infraestructura propia, alojar los módulos de la versión instalada y
proveer `MAPA_WORKER_URL` antes del primer mapa:

```ts
{ provide: MAPA_WORKER_URL, useValue: '/assets/maplibre/maplibre-gl-worker.mjs' }
```

La configuración del worker es global a MapLibre y se establece solo si no existe
ya una URL configurada. Todos los mapas deben compartir la misma versión y URL.
Si se usa el CDN, el navegador requiere CORS y una política CSP que permita sus
módulos y `blob:` en `worker-src`, como indica la guía oficial. Este módulo no
modifica CSP ni configura copias de assets globales.

## Verificación

Las pruebas usan un mock de MapLibre para ejecutarse en JSDOM sin WebGL ni
solicitudes externas. Cubren creación, configuración, cambios de inputs, errores,
limpieza, redimensionamiento delegado y prevención de inicialización duplicada.
No sustituyen una prueba visual con WebGL real ni verifican la disponibilidad de
los servicios públicos de teselas y del CDN en el navegador de producción.

La regresión de navegador de ambos mapas usa teselas PNG sintéticas interceptadas
localmente para verificar zoom, desplazamiento, selección, tamaño y limpieza sin
cargar el servidor público:

```powershell
node src/app/admin/mapas/mapas-integracion.browser.mjs
```

La verificación visual online es separada y limitada a las dos vistas iniciales,
sin barridos de zoom o desplazamiento. No intercepta las teselas; registra HTTP,
MIME, atribución y capturas para su inspección:

```powershell
node src/app/admin/mapas/mapas-integracion.browser.mjs --osm-live
```

Los datos de negocio y la sesión de esos escenarios son simulados; MapLibre y
WebGL son reales. Las capturas/resultados quedan en `dist/mapas-integracion-browser`.
Una prueba con mocks o teselas sintéticas no demuestra carga visual desde Internet.
