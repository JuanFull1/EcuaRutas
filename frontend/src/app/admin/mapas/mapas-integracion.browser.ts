// Entrada exclusiva de pruebas: router, guards, layout y servicios reales; backend simulado.
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Observable, delay, of, throwError } from 'rxjs';
import { App } from '../../app';
import { appConfig } from '../../app.config';
import { API_URL } from '../../services/api.config';
import { AUTH_SESSION_KEY } from '../../services/auth.service';

const lugares = [
  { id: 11, nombre: 'Quito', provincia: 'Pichincha', canton: 'Quito', tipo: 'CIUDAD', activo: true, ubicacion: { longitud: -78.46, latitud: -0.18 } },
  { id: 22, nombre: 'Ambato', provincia: 'Tungurahua', canton: null, tipo: 'PARADA', activo: true, ubicacion: { longitud: -78.62, latitud: -1.24 } },
  { id: 33, nombre: 'Cuenca', provincia: 'Azuay', canton: 'Cuenca', tipo: 'TERMINAL', activo: false, ubicacion: { longitud: -79, latitud: -2.9 } },
  { id: 44, nombre: 'Sin ubicación', provincia: null, canton: null, tipo: 'PARADA', activo: true, ubicacion: null }
];
const rutas = [{ id: 7, nombre: 'Quito – Cuenca', origenLugarId: 11, destinoLugarId: 33, tipoViaje: 'CON_PARADAS', activa: true }];
const paradas = [
  { id: 101, rutaId: 7, lugarId: 11, orden: 0, kmAcumulado: 0, minutosAcumulados: 0, permiteAscenso: true, permiteDescenso: false },
  { id: 102, rutaId: 7, lugarId: 22, orden: 5, kmAcumulado: null, minutosAcumulados: null, permiteAscenso: false, permiteDescenso: true },
  { id: 103, rutaId: 7, lugarId: 33, orden: 10, kmAcumulado: 450.25, minutosAcumulados: 420, permiteAscenso: false, permiteDescenso: true }
];

@Injectable()
class BackendPrueba implements HttpBackend {
  handle(peticion: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    if (peticion.method !== 'GET') return throwError(() => new Error('Esta prueba solo admite consultas.'));
    let body: unknown;
    switch (peticion.url) {
      case `${API_URL}/lugares`: body = lugares; break;
      case `${API_URL}/rutas`: body = rutas; break;
      case `${API_URL}/rutas/7/paradas`: body = paradas; break;
      case `${API_URL}/buses`: case `${API_URL}/plantillas`: body = []; break;
      default: return throwError(() => new HttpErrorResponse({ status: 404, url: peticion.url }));
    }
    return of(new HttpResponse({ status: 200, body, url: peticion.url })).pipe(delay(60));
  }
}

localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
  token: 'sesion-simulada-solo-navegador-de-prueba', expiraEn: new Date(Date.now() + 3600000).toISOString(),
  usuario: { id: 1, nombres: 'Prueba', apellidos: 'Cooperativa', correo: 'prueba@example.test', rol: 'COOPERATIVA', cooperativaId: 5 }
}));
const aviso = document.createElement('p');
aviso.className = 'alert alert-info m-0 rounded-0';
aviso.textContent = 'Prueba de integración: sesión y respuestas HTTP simuladas; layout, navegación y MapLibre reales.';
document.body.prepend(aviso);

bootstrapApplication(App, { providers: [...appConfig.providers, { provide: HttpBackend, useClass: BackendPrueba }] })
  .then(aplicacion => {
    const router = aplicacion.injector.get(Router);
    Object.assign(window, { ecuarutasPrueba: { navegar: (url: string) => router.navigateByUrl(url) } });
  }).catch((causa: unknown) => console.error(causa));
