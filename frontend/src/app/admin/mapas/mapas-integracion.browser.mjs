// Desde frontend: node src/app/admin/mapas/mapas-integracion.browser.mjs
// Usa Node y Chrome/Edge instalados. No instala dependencias ni cambia rutas Angular.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const salida = resolve(frontend, 'dist/mapas-integracion-browser');
// Sin flag, la regresion interactiva usa teselas sinteticas locales, sin trafico a OSM.
// --osm-live comprueba solo las dos vistas iniciales reales, sin barridos de zoom/pan.
const osmReal = process.argv.includes('--osm-live');
const pausa = ms => new Promise(resolve => setTimeout(resolve, ms));

async function compilar() {
  await new Promise((resolveProceso, reject) => {
    const proceso = spawn(process.execPath, [
      resolve(frontend, 'node_modules/@angular/cli/bin/ng.js'), 'build', '--configuration=development',
      '--browser=src/app/admin/mapas/mapas-integracion.browser.ts', '--output-path=dist/mapas-integracion-browser'
    ], { cwd: frontend, windowsHide: true, stdio: 'inherit' });
    proceso.on('error', reject);
    proceso.on('exit', codigo => codigo === 0 ? resolveProceso() : reject(new Error(`Falló la compilación de prueba (${codigo}).`)));
  });
}

async function encontrarNavegador() {
  for (const candidato of [
    process.env['ECUARUTAS_BROWSER'],
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean)) {
    try { await access(candidato); return candidato; } catch { /* Buscar la siguiente instalación. */ }
  }
  throw new Error('No se encontró Chrome/Edge. Define ECUARUTAS_BROWSER con su ruta.');
}

function conectar(url) {
  return new Promise((resolveConexion, reject) => {
    const websocket = new WebSocket(url);
    const pendientes = new Map();
    const errores = [];
    let secuencia = 0;
    let teselaSimulada;
    const respuestasTeselas = [];
    websocket.onopen = () => resolveConexion({
      websocket, errores, respuestasTeselas, simularTeselas: imagen => { teselaSimulada = imagen; },
      enviar(metodo, params = {}) {
        return new Promise((resolveMensaje, rejectMensaje) => {
          const id = ++secuencia;
          const temporizador = setTimeout(() => { pendientes.delete(id); rejectMensaje(new Error(`Tiempo agotado: ${metodo}`)); }, 15000);
          pendientes.set(id, { resolve: resolveMensaje, reject: rejectMensaje, temporizador });
          websocket.send(JSON.stringify({ id, method: metodo, params }));
        });
      }
    });
    websocket.onerror = reject;
    websocket.onmessage = evento => {
      const mensaje = JSON.parse(evento.data);
      if (mensaje.method === 'Fetch.requestPaused' && teselaSimulada) {
        websocket.send(JSON.stringify({ id: ++secuencia, method: 'Fetch.fulfillRequest', params: {
          requestId: mensaje.params.requestId, responseCode: 200,
          responseHeaders: [{ name: 'Content-Type', value: 'image/png' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: teselaSimulada
        } }));
      } else if (mensaje.method === 'Network.responseReceived' && mensaje.params.response.url.startsWith('https://tile.openstreetmap.org/')) {
        const { url, status, mimeType } = mensaje.params.response;
        respuestasTeselas.push({ url, status, mimeType });
      } else if (mensaje.id) {
        const pendiente = pendientes.get(mensaje.id);
        if (!pendiente) return;
        pendientes.delete(mensaje.id);
        clearTimeout(pendiente.temporizador);
        if (mensaje.error) pendiente.reject(new Error(JSON.stringify(mensaje.error)));
        else pendiente.resolve(mensaje.result);
      } else if (mensaje.method === 'Runtime.exceptionThrown' ||
        (mensaje.method === 'Network.loadingFailed' && !mensaje.params.canceled) ||
        (mensaje.method === 'Runtime.consoleAPICalled' && mensaje.params.type === 'error')) {
        errores.push(mensaje.params);
      }
    };
    websocket.onclose = () => {
      for (const pendiente of pendientes.values()) {
        clearTimeout(pendiente.temporizador);
        pendiente.reject(new Error('Se cerró la conexión con el navegador.'));
      }
      pendientes.clear();
    };
  });
}

let navegador;
let servidor;
let cdp;
let perfil;
try {
  const ejecutable = await encontrarNavegador();
  await compilar();
  const raiz = existsSync(resolve(salida, 'browser/index.html')) ? resolve(salida, 'browser') : salida;
  servidor = createServer(async (peticion, respuesta) => {
    try {
      const pathname = decodeURIComponent(new URL(peticion.url, 'http://localhost').pathname);
      const archivo = resolve(raiz, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!archivo.startsWith(raiz + sep)) throw new Error('Ruta fuera del directorio de prueba.');
      const contenido = await readFile(archivo);
      const tipos = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
      respuesta.writeHead(200, { 'Content-Type': tipos[extname(archivo)] ?? 'application/octet-stream' });
      respuesta.end(contenido);
    } catch {
      respuesta.writeHead(404);
      respuesta.end('No disponible');
    }
  });
  await new Promise(resolveServidor => servidor.listen(0, '127.0.0.1', resolveServidor));
  perfil = await mkdtemp(resolve(salida, 'perfil-'));
  navegador = spawn(ejecutable, [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--remote-debugging-port=0',
    `--user-data-dir=${perfil}`, 'about:blank'
  ], { windowsHide: true, stdio: 'ignore' });
  let puerto;
  for (let intento = 0; intento < 100; intento++) {
    try { puerto = Number((await readFile(resolve(perfil, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; }
    catch { await pausa(100); }
  }
  if (!puerto) throw new Error('El navegador no abrió el puerto de depuración.');
  const paginas = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json();
  cdp = await conectar(paginas.find(pagina => pagina.type === 'page').webSocketDebuggerUrl);
  await cdp.enviar('Page.enable');
  await cdp.enviar('Runtime.enable');
  await cdp.enviar('Network.enable');
  const evaluar = async expression => {
    const resultado = await cdp.enviar('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (resultado.exceptionDetails) throw new Error(JSON.stringify(resultado.exceptionDetails));
    return resultado.result.value;
  };
  const esperar = async (expression, mensaje) => {
    for (let intento = 0; intento < 150; intento++) {
      if (await evaluar(expression)) return;
      await pausa(200);
    }
    throw new Error(`${mensaje}. Errores del navegador: ${JSON.stringify(cdp.errores.slice(0, 3))}`);
  };
  const capturar = async nombre => {
    // Las capturas más allá del viewport pueden recortar superficies WebGL en Chrome headless.
    const captura = await cdp.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(resolve(salida, nombre), Buffer.from(captura.data, 'base64'));
  };
  const mapaReal = `ng.getComponent(document.querySelector('app-mapa')).mapa`;
  const seleccionar = (componente, propiedad) => `ng.getComponent(document.querySelector('${componente}')).${propiedad}`;
  const navegar = async url => {
    await evaluar(`window.ecuarutasPrueba.navegar(${JSON.stringify(url)})`);
  };
  const pulsar = async selector => {
    await evaluar(`document.querySelector(${JSON.stringify(selector)}).click()`);
  };
  const mapaCargado = async () => {
    await esperar(`document.querySelectorAll('.maplibregl-canvas').length === 1 && ${mapaReal}?.loaded() && !${mapaReal}.isMoving()`, 'No terminó de cargar el mapa');
    if (!await evaluar(`!!${mapaReal}.painter.context.gl`)) throw new Error('No se creó un contexto WebGL real.');
  };
  const sinDesbordamiento = async () => {
    if (!await evaluar('document.documentElement.scrollWidth <= innerWidth + 1')) throw new Error('Desbordamiento horizontal del layout.');
  };
  const capturaMapa = async nombre => {
    await evaluar(`document.querySelector('.maplibregl-popup-close-button')?.click(); document.querySelector('app-mapa').scrollIntoView({ block: 'center' })`);
    await pausa(350);
    await sinDesbordamiento();
    await capturar(nombre);
  };
  const menuMovil = async () => {
    await pulsar('button[aria-label="Abrir menú"]');
    await esperar(`document.querySelector('.sidebar-open') && document.querySelector('.sidebar-overlay')`, 'No abrió el menú móvil');
    await pausa(300);
    await sinDesbordamiento();
    await pulsar('.sidebar-overlay');
    await esperar(`!document.querySelector('.sidebar-open')`, 'No cerró el menú móvil');
    await pausa(300);
    const correcto = await evaluar(`(() => {
      const mapa = ${mapaReal};
      return Math.abs(mapa.getCanvas().clientWidth - mapa.getContainer().clientWidth) <= 1;
    })()`);
    if (!correcto) throw new Error('El canvas no se ajusta al contenedor tras cerrar el menú.');
  };
  await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await cdp.enviar('Page.navigate', { url: `http://127.0.0.1:${servidor.address().port}/` });
  await esperar('!!window.ecuarutasPrueba', 'No inició la aplicación de pruebas');
  if (osmReal) {
    for (const [nombre, url, marcadores] of [
      ['lugares', '/cooperativas/mapas/lugares', 3], ['rutas', '/cooperativas/mapas/rutas?rutaId=7', 3]
    ]) {
      await navegar(url); await mapaCargado();
      await esperar(`document.querySelectorAll('button.maplibregl-marker').length === ${marcadores}`, 'Faltan marcadores');
      if (!await evaluar(`(() => {
        const mapa = ${mapaReal}; const estilo = mapa.getStyle();
        const credito = document.querySelector('.maplibregl-ctrl-attrib a[href="https://www.openstreetmap.org/copyright"]');
        return estilo.sources['osm-raster']?.type === 'raster' && estilo.layers.some(capa => capa.id === 'osm-base' && capa.type === 'raster') &&
          credito && credito.getBoundingClientRect().width > 0 && mapa.scrollZoom.isEnabled() && mapa.dragPan.isEnabled();
      })()`)) throw new Error('Falta el mapa raster, atribucion visible o interactividad.');
      if (nombre === 'rutas' && !await evaluar(`${mapaReal}.getStyle().layers.some(capa => capa.id.startsWith('ecuarutas-recorrido-') && capa.type === 'line')`)) throw new Error('Falta la linea del recorrido.');
      await capturaMapa(`osm-${nombre}-real.png`);
    }
    if (!cdp.respuestasTeselas.length || cdp.respuestasTeselas.some(r => r.status !== 200 || r.mimeType !== 'image/png')) throw new Error('No se verificaron teselas PNG reales con HTTP 200.');
    if (cdp.errores.length) throw new Error(`Errores del navegador: ${JSON.stringify(cdp.errores.slice(0, 3))}`);
    const reporte = { resultado: 'aprobado', teselasOSMReales: true, datosHTTPySesionSimulados: true,
      vistasInicialesSinBarridos: true, atribucionVisible: true, marcadoresYLinea: true,
      respuestasTeselas: cdp.respuestasTeselas, erroresNavegador: cdp.errores,
      capturas: ['osm-lugares-real.png', 'osm-rutas-real.png'] };
    await writeFile(resolve(salida, 'resultado-osm-real.json'), JSON.stringify(reporte, null, 2));
    console.log(JSON.stringify({ ...reporte, respuestasTeselas: reporte.respuestasTeselas.length }, null, 2));
  } else {
    const tesela = await evaluar(`(() => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const contexto = canvas.getContext('2d'); contexto.fillStyle = '#e8e8e8'; contexto.fillRect(0, 0, 64, 64);
      contexto.fillStyle = '#cccccc'; contexto.fillRect(0, 0, 32, 32); contexto.fillRect(32, 32, 32, 32);
      return canvas.toDataURL('image/png').split(',')[1];
    })()`);
    cdp.simularTeselas(tesela);
    await cdp.enviar('Fetch.enable', { patterns: [{ urlPattern: 'https://tile.openstreetmap.org/*' }] });
  await navegar('/cooperativas/inicio');
  await esperar(`document.querySelector('aside a[href="/cooperativas/mapas/lugares"]') && document.querySelector('aside a[href="/cooperativas/mapas/rutas"]')`, 'Faltan accesos operativos');
  await pulsar('aside a[href="/cooperativas/mapas/lugares"]');
  await mapaCargado();
  await esperar(`document.querySelectorAll('button.maplibregl-marker').length === 3`, 'No aparecen los lugares geográficos');
  await pulsar('aside a[href="/cooperativas/lugares"]');
  await esperar(`document.querySelector('a[aria-label="Ver en mapa Quito"]')`, 'No cargó gestión de lugares');
  await pulsar('a[aria-label="Ver en mapa Quito"]');
  await mapaCargado();
  await esperar(`${seleccionar('app-lugares-mapa', 'seleccionado()')}?.id === 11`, 'La navegación no seleccionó Quito');
  if (!await evaluar(`document.querySelector('aside a[href="/cooperativas/mapas/lugares"]').classList.contains('active')`)) throw new Error('No está activo el enlace del mapa de lugares.');
  await evaluar(`void (window.mapaAnterior = ${mapaReal})`);
  await capturaMapa('lugares-escritorio.png');
  await navegar('/cooperativas/mapas/lugares?lugarId=44');
  await esperar(`${seleccionar('app-lugares-mapa', 'seleccionado()')}?.id === 44`, 'No seleccionó el lugar sin coordenadas');
  if (!await evaluar(`${mapaReal} === window.mapaAnterior && document.querySelector('app-lugares-mapa').textContent.includes('Sin coordenadas')`)) throw new Error('Se recreó el mapa o faltó el mensaje sin coordenadas.');
  await navegar('/cooperativas/mapas/lugares?lugarId=11');
  await mapaCargado();
  await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 1100, deviceScaleFactor: 1, mobile: true });
  await pausa(500);
  await menuMovil();
  await capturaMapa('lugares-movil.png');
  await pulsar('nav[aria-label="Volver a la gestión"] a');
  await esperar(`document.querySelector('app-lugares-lista')`, 'No regresó a gestión de lugares');
  if (!await evaluar(`window.mapaAnterior._removed === true && !document.querySelector('.maplibregl-canvas')`)) throw new Error('El mapa de lugares no se liberó al salir.');
  await navegar('/cooperativas/rutas');
  await esperar(`document.querySelector('a[aria-label="Ver en mapa Quito – Cuenca"]')`, 'No cargó gestión de rutas');
  await pulsar('a[aria-label="Ver en mapa Quito – Cuenca"]');
  await mapaCargado();
  await esperar(`${seleccionar('app-rutas-mapa', 'rutaId()')} === 7 && document.querySelectorAll('button.maplibregl-marker').length === 3`, 'No cargó el recorrido solicitado');
  if (!await evaluar(`document.querySelector('#ruta-mapa-selector').value === '7'`)) throw new Error('El selector no refleja la ruta abierta desde el listado.');
  const lineaValida = `(() => {
    const mapa = ${mapaReal};
    const capa = mapa.getStyle().layers.find(capa => capa.id.startsWith('ecuarutas-recorrido-'));
    return capa && JSON.stringify(mapa.getSource(capa.source).serialize().data.geometry.coordinates) === JSON.stringify([[-78.46,-0.18],[-78.62,-1.24],[-79,-2.9]]);
  })()`;
  await esperar(lineaValida, 'El trazado no sigue el orden de los lugares');
  await menuMovil();
  await capturaMapa('rutas-movil.png');
  await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await pausa(500);
  await evaluar(`Array.from(document.querySelectorAll('button')).find(boton => boton.textContent.includes('Mostrar recorrido completo')).click()`);
  await mapaCargado();
  await capturaMapa('rutas-escritorio.png');
  await navegar('/cooperativas/paradas');
  await esperar(`document.querySelector('#paradas-ruta option[value="7"]')`, 'No cargó gestión de paradas');
  await evaluar(`(() => { const selector = document.querySelector('#paradas-ruta'); selector.value = '7'; selector.dispatchEvent(new Event('change')); })()`);
  await esperar(`document.querySelector('a[aria-label="Ver en mapa parada 5 de Ambato"]')`, 'No cargaron las paradas');
  await pulsar('a[aria-label="Ver en mapa parada 5 de Ambato"]');
  await mapaCargado();
  await esperar(`${seleccionar('app-rutas-mapa', 'puntoSeleccionado()')}?.parada?.id === 102`, 'La navegación no seleccionó la parada de Ambato');
  if (!await evaluar(`document.querySelector('.maplibregl-popup-content')?.textContent.includes('Ambato')`)) throw new Error('No abrió la información de la parada.');
  await evaluar(`void (window.mapaAnterior = ${mapaReal})`);
  await navegar('/cooperativas/mapas/rutas?rutaId=7&paradaId=101');
  await esperar(`${seleccionar('app-rutas-mapa', 'puntoSeleccionado()')}?.parada?.id === 101`, 'No actualizó la parada por parámetros');
  if (!await evaluar(`${mapaReal} === window.mapaAnterior`)) throw new Error('Se recreó el mapa al cambiar los parámetros.');
  // Interaccion comprobada sobre teselas sinteticas, sin solicitudes al servidor publico.
  await evaluar(`document.querySelector('.maplibregl-popup-close-button')?.click()`);
  const zoomAnterior = await evaluar(`${mapaReal}.getZoom()`);
  await pulsar('.maplibregl-ctrl-zoom-in');
  await esperar(`${mapaReal}.getZoom() > ${zoomAnterior} + 0.5 && !${mapaReal}.isMoving()`, 'No funciona el control de zoom');
  const centroAnterior = await evaluar(`${mapaReal}.getCenter().toArray()`);
  const posicion = await evaluar(`(() => { const r = ${mapaReal}.getCanvas().getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await cdp.enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', ...posicion });
  await cdp.enviar('Input.dispatchMouseEvent', { type: 'mousePressed', ...posicion, button: 'left', clickCount: 1 });
  await cdp.enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x: posicion.x + 60, y: posicion.y + 25, button: 'left', buttons: 1 });
  await cdp.enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: posicion.x + 60, y: posicion.y + 25, button: 'left', clickCount: 1 });
  await esperar(`Math.abs(${mapaReal}.getCenter().lng - ${centroAnterior[0]}) > 0.000001`, 'No funciona el desplazamiento');
  await pulsar('aside a[href="/cooperativas/inicio"]');
  await esperar(`!document.querySelector('app-mapa') && window.mapaAnterior._removed === true`, 'No se liberó el mapa de rutas');
  const reporte = {
    resultado: 'aprobado', datosHTTPySesionSimulados: true, routerGuardsLayoutReales: true,
    teselasSinteticasSinTraficoOSM: true, zoomYDesplazamiento: true,
    webglRealPorSoftware: true, navegacionDesdeMenuYLugaresRutasParadas: true,
    seleccionPorParametrosSinRecrearMapa: true, geoJSONOrdenado: true, limpiezaAlNavegar: true,
    menuMovilYTamanoCanvas: true, sinDesbordamiento: [1440, 390], erroresNavegador: cdp.errores,
    capturas: ['lugares-escritorio.png', 'lugares-movil.png', 'rutas-escritorio.png', 'rutas-movil.png']
  };
  if (cdp.errores.length) throw new Error(`Errores inesperados: ${JSON.stringify(cdp.errores.slice(0, 3))}`);
  await writeFile(resolve(salida, 'resultado.json'), JSON.stringify(reporte, null, 2));
  console.log(JSON.stringify(reporte, null, 2));
  }
} catch (causa) {
  console.error(causa);
  process.exitCode = 1;
} finally {
  if (cdp) await cdp.enviar('Browser.close').catch(() => undefined);
  cdp?.websocket.close();
  navegador?.kill();
  servidor?.closeAllConnections();
  servidor?.close();
  // El perfil aislado queda en dist; nunca se usa el perfil personal del navegador.
  if (perfil) console.log(`Artefactos de prueba: ${salida}`);
}
