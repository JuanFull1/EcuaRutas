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

## Fuente cartográfica de desarrollo

No se encontró un proveedor aprobado en el repositorio. El valor inicial es
`https://demotiles.maplibre.org/style.json`, el mapa mundial de demostración de
[MapLibre Demo Tiles](https://github.com/maplibre/demotiles). No requiere claves.
Sus polígonos de países proceden de Natural Earth y sus teselas tienen niveles
0–6: sirve para comprobar la integración, no como cartografía vial detallada.

El repositorio del ejemplo declara licencia BSD-3-Clause; deben respetarse su
[licencia](https://github.com/maplibre/demotiles/blob/gh-pages/LICENSE) y las
condiciones de las fuentes que se incorporen. Natural Earth declara sus datos de
[dominio público](https://www.naturalearthdata.com/about/terms-of-use/).
Se muestran créditos a MapLibre y Natural Earth para el estilo de demostración.
El control nativo de atribución permanece expandido y conserva automáticamente
las atribuciones declaradas por las fuentes de cualquier estilo configurado.

El carácter público del servidor de demostración no equivale a una autorización
de uso ilimitado ni a una garantía de disponibilidad en producción. Antes de
publicar, seleccionar un proveedor aprobado o alojamiento propio y suministrar su
estilo mediante `estilo`. No hay sustitución automática por otra fuente si falla.

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
