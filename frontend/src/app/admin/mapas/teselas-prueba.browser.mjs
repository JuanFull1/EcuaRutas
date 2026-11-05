import { crc32, deflateSync } from 'node:zlib';

// PNG local de 256 px: los movimientos automatizados no descargan teselas OSM.
// Comprueba el renderizador ráster; no representa cartografía real.
function teselaLocal() {
  const bloque = (tipo, datos) => {
    const nombre = Buffer.from(tipo);
    const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([nombre, datos])));
    return Buffer.concat([largo, nombre, datos, crc]);
  };
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(256, 0); cabecera.writeUInt32BE(256, 4);
  cabecera[8] = 8; cabecera[9] = 6;
  const pixeles = Buffer.alloc(256 * (256 * 4 + 1));
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++)
    pixeles.set([230, 236, 240, 255], y * (256 * 4 + 1) + 1 + x * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloque('IHDR', cabecera), bloque('IDAT', deflateSync(pixeles)), bloque('IEND', Buffer.alloc(0))]).toString('base64');
}

export async function simularTeselasOSM(cdp) {
  const body = teselaLocal();
  const conteo = { atendidas: 0, canceladas: 0 };
  cdp.websocket.addEventListener('message', evento => {
    const mensaje = JSON.parse(evento.data);
    if (mensaje.method !== 'Fetch.requestPaused') return;
    cdp.enviar('Fetch.fulfillRequest', {
      requestId: mensaje.params.requestId, responseCode: 200,
      responseHeaders: [
        { name: 'Content-Type', value: 'image/png' },
        { name: 'Access-Control-Allow-Origin', value: '*' },
        { name: 'Cache-Control', value: 'public, max-age=604800' }
      ], body
    }).then(() => conteo.atendidas++).catch(causa => {
      // MapLibre cancela solicitudes pendientes al mover la cámara o destruir el mapa.
      if (causa.message.includes('Invalid InterceptionId')) conteo.canceladas++;
      else cdp.errores.push({ teselaSimulada: causa.message });
    });
  });
  await cdp.enviar('Fetch.enable', { patterns: [{ urlPattern: 'https://tile.openstreetmap.org/*' }] });
  return conteo;
}

export async function comprobarBaseOSM(cdp) {
  const resultado = await cdp.enviar('Runtime.evaluate', { returnByValue: true, expression: `(() => {
    const mapa = ng.getComponent(document.querySelector('app-mapa')).mapa;
    const estilo = mapa.getStyle();
    const fuente = estilo.sources.openstreetmap;
    const enlace = document.querySelector('.maplibregl-ctrl-attrib a[href="https://www.openstreetmap.org/copyright"]');
    return fuente?.type === 'raster' && fuente.tileSize === 256 && fuente.maxzoom === 19 &&
      fuente.tiles[0] === 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' &&
      estilo.layers[0].type === 'raster' && estilo.layers[0].source === 'openstreetmap' &&
      enlace?.textContent === 'OpenStreetMap' && enlace.getBoundingClientRect().width > 0;
  })()` });
  if (resultado.exceptionDetails || resultado.result.value !== true)
    throw new Error('Falta la base ráster OSM estándar o su atribución visible.');
}
