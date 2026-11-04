// Entrada exclusiva de prueba: nunca se registra en la navegación de la aplicación.
import { bootstrapApplication } from '@angular/platform-browser';
import { of } from 'rxjs';

import { LugarDto } from '../../lugares/lugar.model';
import { LugarService } from '../../lugares/lugar.service';
import { LugaresMapa } from './lugares-mapa';

const lugaresPrueba: LugarDto[] = [
  { id: 11, nombre: 'Quito', provincia: 'Pichincha', canton: 'Quito', tipo: 'CIUDAD', activo: true, ubicacion: { latitud: -0.18, longitud: -78.46 } },
  { id: 22, nombre: 'Cuenca', provincia: 'Azuay', canton: 'Cuenca', tipo: 'TERMINAL', activo: false, ubicacion: { latitud: -2.9, longitud: -79 } },
  { id: 33, nombre: 'Sin ubicación', provincia: null, canton: null, tipo: 'PARADA', activo: true, ubicacion: null }
];

const aviso = document.createElement('p');
aviso.className = 'alert alert-info m-3';
aviso.textContent = 'Prueba de navegador: lugares simulados; MapLibre y cartografía reales.';
const contenedor = document.createElement('main');
contenedor.className = 'p-3';
contenedor.append(document.createElement('app-lugares-mapa'));
document.body.replaceChildren(aviso, contenedor);

bootstrapApplication(LugaresMapa, {
  providers: [{ provide: LugarService, useValue: { listar: () => of(lugaresPrueba) } }]
}).catch((causa: unknown) => {
  console.error(causa);
  document.body.dataset['errorPrueba'] = 'No se pudo iniciar la entrada de pruebas.';
});
