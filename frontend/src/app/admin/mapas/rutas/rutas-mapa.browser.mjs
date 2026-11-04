// Desde frontend: node src/app/admin/mapas/rutas/rutas-mapa.browser.mjs
// Usa Node y Chrome/Edge instalados. No instala dependencias ni cambia rutas Angular.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const salida = resolve(frontend, 'dist/mapa-rutas-browser');
const pausa = ms => new Promise(resolve => setTimeout(resolve, ms));

async function compilar() {
  await new Promise((resolveProceso, reject) => {
    const proceso = spawn(process.execPath, [
      resolve(frontend, 'node_modules/@angular/cli/bin/ng.js'), 'build', '--configuration=development',
      '--browser=src/app/admin/mapas/rutas/rutas-mapa.browser.ts', '--output-path=dist/mapa-rutas-browser'
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
    websocket.onopen = () => resolveConexion({
      websocket, errores,
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
      if (mensaje.id) {
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
    throw new Error(`${mensaje}. Errores del navegador: ${JSON.stringify(cdp.errores)}`);
  };
  const capturar = async nombre => {
    // Las capturas más allá del viewport pueden recortar superficies WebGL en Chrome headless.
    const captura = await cdp.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(resolve(salida, nombre), Buffer.from(captura.data, 'base64'));
  };
  const mapaReal = `ng.getComponent(document.querySelector('app-mapa')).mapa`;
  const lineaValida = `(() => {
    const mapa = ${mapaReal};
    if (!mapa.isStyleLoaded()) return false;
    const estilo = mapa.getStyle();
    if (!estilo?.layers) return false;
    const capas = estilo.layers.filter(capa => capa.id.startsWith('ecuarutas-recorrido-'));
    if (capas.length !== 1 || capas[0].type !== 'line') return false;
    const dato = mapa.getSource(capas[0].source).serialize().data;
    return dato.geometry.type === 'LineString' && JSON.stringify(dato.geometry.coordinates) === JSON.stringify([[-78.46,-0.18],[-78.62,-1.24],[-79,-2.9]]);
  })()`;
  const puntosDentroDelMapa = `(() => {
    const area = document.querySelector('.mapa-contenedor').getBoundingClientRect();
    const puntos = Array.from(document.querySelectorAll('button.maplibregl-marker'));
    return puntos.length === 3 && puntos.every(boton => {
      const punto = boton.getBoundingClientRect();
      const x = (punto.left + punto.right) / 2;
      const y = (punto.top + punto.bottom) / 2;
      return x >= area.left && x <= area.right && y >= area.top && y <= area.bottom;
    });
  })()`;
  await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await cdp.enviar('Page.navigate', { url: `http://127.0.0.1:${servidor.address().port}/` });
  await esperar(`Array.from(document.querySelectorAll('#ruta-mapa-selector option')).some(opcion => opcion.value === '7')`, 'No se cargaron las rutas de prueba');
  await evaluar(`(() => { const selector = document.querySelector('#ruta-mapa-selector'); selector.value = '7'; selector.dispatchEvent(new Event('change')); })()`);
  await esperar(`document.querySelectorAll('button.maplibregl-marker').length === 3`, 'No se renderizaron origen, parada y destino');
  await esperar(lineaValida, 'La línea GeoJSON no sigue el orden esperado');
  await evaluar(`Array.from(document.querySelectorAll('.punto-opcion')).find(boton => boton.dataset.punto === 'parada:102').click()`);
  await esperar(`document.querySelector('.maplibregl-popup-content')?.textContent.includes('Ambato')`, 'No funcionó la selección de una parada');
  await evaluar(`Array.from(document.querySelectorAll('button.maplibregl-marker')).find(boton => boton.getAttribute('aria-label').startsWith('Origen')).click()`);
  await esperar(`document.querySelector('.maplibregl-popup-content')?.textContent.includes('Funciones de este lugar')`, 'No aparecen las funciones compartidas');
  await evaluar(`Array.from(document.querySelectorAll('.maplibregl-popup-content button')).find(boton => boton.textContent.includes('orden 0')).click()`);
  await esperar(`Array.from(document.querySelectorAll('.punto-opcion')).find(boton => boton.dataset.punto === 'parada:101').getAttribute('aria-pressed') === 'true'`, 'La selección no distingue la identidad de parada');
  await evaluar(`(() => {
    const mapa = ${mapaReal}; const base = mapa.getStyle();
    base.layers = base.layers.filter(capa => !capa.id.startsWith('ecuarutas-recorrido-'));
    for (const id of Object.keys(base.sources)) if (id.startsWith('ecuarutas-recorrido-')) delete base.sources[id];
    mapa.setStyle(base, { diff: false });
  })()`);
  await esperar(lineaValida, 'No se restauró la línea tras recargar el estilo');
  if (!await evaluar(`document.querySelectorAll('button.maplibregl-marker').length === 3`)) throw new Error('Se duplicaron los marcadores al recargar el estilo.');
  await evaluar(`document.querySelector('.maplibregl-popup-close-button')?.click()`);
  await evaluar(`Array.from(document.querySelectorAll('button')).find(boton => boton.textContent.includes('Mostrar recorrido completo')).click()`);
  await esperar(`${mapaReal}.loaded() && !${mapaReal}.isMoving()`, 'No terminó el ajuste de cámara');
  await evaluar(`document.querySelector('app-mapa').scrollIntoView({ block: 'center' })`);
  await pausa(500);
  if (!await evaluar(puntosDentroDelMapa)) throw new Error('El ajuste de escritorio no incluye todos los puntos.');
  if (!await evaluar('document.documentElement.scrollWidth <= innerWidth + 1')) throw new Error('Desbordamiento horizontal en escritorio.');
  await capturar('escritorio.png');
  await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 1100, deviceScaleFactor: 1, mobile: true });
  await evaluar(`document.querySelector('app-mapa').scrollIntoView({ block: 'center' })`);
  await pausa(700);
  await evaluar(`Array.from(document.querySelectorAll('button')).find(boton => boton.textContent.includes('Mostrar recorrido completo')).click()`);
  await esperar(`${mapaReal}.loaded() && !${mapaReal}.isMoving()`, 'No terminó el ajuste móvil');
  if (!await evaluar(puntosDentroDelMapa)) throw new Error('El ajuste móvil no incluye todos los puntos.');
  if (!await evaluar('document.documentElement.scrollWidth <= innerWidth + 1')) throw new Error('Desbordamiento horizontal en móvil.');
  await capturar('movil.png');
  await evaluar(`globalThis.mapaPrueba = ${mapaReal}; document.querySelector('#prueba-desmontar').click()`);
  await esperar(`document.querySelectorAll('.maplibregl-marker, .maplibregl-popup, .maplibregl-canvas').length === 0 && globalThis.mapaPrueba._removed === true`, 'No se liberó el mapa al desmontar');
  const reporte = {
    resultado: 'aprobado', webglRealPorSoftware: true, datosSimulados: true,
    marcadoresSinDuplicados: 3, geoJSONOrdenado: true, funcionesCompartidas: true,
    seleccionBidireccional: true, restauracionEstilo: true, limpiezaAlDesmontar: true,
    sinDesbordamiento: [1440, 390], erroresNavegador: cdp.errores,
    capturas: ['escritorio.png', 'movil.png']
  };
  if (cdp.errores.length) throw new Error(`El navegador registró errores: ${JSON.stringify(cdp.errores)}`);
  await writeFile(resolve(salida, 'resultado.json'), JSON.stringify(reporte, null, 2));
  console.log(JSON.stringify(reporte, null, 2));
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
