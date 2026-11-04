// Entrada exclusiva de prueba: nunca se registra en la navegación de la aplicación.
import { bootstrapApplication } from '@angular/platform-browser';
import { delay, of } from 'rxjs';

import { LugarDto } from '../../lugares/lugar.model';
import { LugarService } from '../../lugares/lugar.service';
import { RutaParadaDto } from '../../paradas/ruta-parada.model';
import { RutaParadaService } from '../../paradas/ruta-parada.service';
import { RutaDto } from '../../rutas/ruta.model';
import { RutaService } from '../../rutas/ruta.service';
import { RutasMapa } from './rutas-mapa';

const rutas: RutaDto[] = [
  { id: 7, nombre: 'Quito – Cuenca', origenLugarId: 11, destinoLugarId: 33, tipoViaje: 'CON_PARADAS', activa: true },
  { id: 8, nombre: 'Regreso', origenLugarId: 33, destinoLugarId: 11, tipoViaje: 'DIRECTO', activa: false }
];
const lugares: LugarDto[] = [
  { id: 11, nombre: 'Quito', provincia: 'Pichincha', canton: null, tipo: 'CIUDAD', activo: true, ubicacion: { longitud: -78.46, latitud: -0.18 } },
  { id: 22, nombre: 'Ambato', provincia: 'Tungurahua', canton: null, tipo: 'PARADA', activo: true, ubicacion: { longitud: -78.62, latitud: -1.24 } },
  { id: 33, nombre: 'Cuenca', provincia: 'Azuay', canton: null, tipo: 'TERMINAL', activo: false, ubicacion: { longitud: -79, latitud: -2.9 } }
];
const paradas: RutaParadaDto[] = [
  { id: 103, rutaId: 7, lugarId: 33, orden: 10, kmAcumulado: 450.25, minutosAcumulados: 420, permiteAscenso: false, permiteDescenso: true },
  { id: 101, rutaId: 7, lugarId: 11, orden: 0, kmAcumulado: 0, minutosAcumulados: 0, permiteAscenso: true, permiteDescenso: false },
  { id: 102, rutaId: 7, lugarId: 22, orden: 5, kmAcumulado: null, minutosAcumulados: null, permiteAscenso: false, permiteDescenso: true }
];

const aviso = document.createElement('p');
aviso.className = 'alert alert-info m-3';
aviso.textContent = 'Prueba de navegador: rutas, paradas y lugares simulados; MapLibre y cartografía reales.';
const desmontar = document.createElement('button');
desmontar.type = 'button';
desmontar.id = 'prueba-desmontar';
desmontar.className = 'btn btn-sm btn-outline-secondary ms-3';
desmontar.textContent = 'Desmontar visualizador (prueba)';
const contenedor = document.createElement('main');
contenedor.className = 'p-3';
contenedor.append(document.createElement('app-rutas-mapa'));
document.body.replaceChildren(aviso, desmontar, contenedor);
bootstrapApplication(RutasMapa, {
  providers: [
    { provide: RutaService, useValue: { listar: () => of(rutas).pipe(delay(40)) } },
    { provide: LugarService, useValue: { listar: () => of(lugares).pipe(delay(40)) } },
    { provide: RutaParadaService, useValue: { listar: (rutaId: number) => of(paradas.filter(parada => parada.rutaId === rutaId)).pipe(delay(100)) } }
  ]
}).then(aplicacion => desmontar.addEventListener('click', () => aplicacion.destroy(), { once: true }))
  .catch((causa: unknown) => { console.error(causa); document.body.dataset['errorPrueba'] = 'No se pudo iniciar la prueba.'; });
