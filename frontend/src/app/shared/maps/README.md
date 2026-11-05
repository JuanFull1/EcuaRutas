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

## Cartografía estándar OpenStreetMap

Los dos módulos utilizan `ESTILO_MAPA_OSM`: estilo MapLibre versión 8 con origen
y capa ráster, teselas de 256 px y URL
`https://tile.openstreetmap.org/{z}/{x}/{y}.png`. La fuente admite zoom 0–19;
MapLibre amplía el último nivel disponible si el usuario sigue acercándose.
No requiere claves ni servicios de pago. Los marcadores y el trazado GeoJSON se
superponen a esta base sin modificar sus datos o algoritmos.

La atribución `© OpenStreetMap contributors` enlaza a la licencia y aparece en el
control nativo expandido. Se retiran los créditos de Natural Earth, que no es la
fuente del nuevo estilo.

Se respeta la [política de teselas de OSM](https://operations.osmfoundation.org/policies/tiles/):
el navegador mantiene su caché HTTP y envía sus cabeceras User-Agent y Referer
normales. El alojamiento no debe suprimir Referer ni forzar cabeceras que
desactiven la caché. No hay descargas masivas, precargas para uso sin conexión ni
reintentos propios. El servicio público no garantiza disponibilidad; los fallos
se comunican mediante el aviso existente sin sustituir el proveedor.

Las pruebas de navegador interceptan las solicitudes OSM y devuelven un PNG local
de 256 px. Comprueban el renderizador real, atribución, marcadores, ventanas,
trazados y tamaños sin descargar teselas durante los movimientos automatizados.
Sus capturas no verifican el contenido cartográfico real del servidor público.

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
