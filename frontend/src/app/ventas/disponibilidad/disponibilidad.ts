import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import {
  DecimalPipe
} from '@angular/common';

import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Lugar {
  lugarId: number;
  nombre: string;
  provincia?: string;
  canton?: string;
}

interface Viaje {
  viajeId: number;
  frecuenciaId: number;
  rutaId: number;
  rutaNombre: string;
  codigoFrecuencia?: string;
  salidaProgramada: string;
  estado: string;
  busId: number;
  numeroInternoBus: string;
  placaBus: string;
  capacidadBus: number;
  origenRutaParadaId: number;
  destinoRutaParadaId: number;
  precioBase: number;
  cooperativa: string;
}

@Component({
  selector: 'app-disponibilidad',
  standalone: true,
  imports: [
    FormsModule,
    DecimalPipe
  ],
  templateUrl: './disponibilidad.html',
  styleUrl: './disponibilidad.css'
})
export class Disponibilidad implements OnInit {

  private readonly apiUrl =
    'http://localhost:5268/api/Disponibilidad';

  lugares: Lugar[] = [];
  viajes: Viaje[] = [];

  origenLugarId: number | null = null;
  destinoLugarId: number | null = null;
  fecha = '';

  cargandoLugares = false;
  cargandoViajes = false;

  mensaje = '';
  error = '';

  ngOnInit(): void {
    this.cargarLugares();
  }

  constructor(
  private readonly http: HttpClient,
  private readonly cdr: ChangeDetectorRef
) {}

  cargarLugares(): void {

    this.cargandoLugares = true;
    this.error = '';

    this.http
      .get<Lugar[]>(`${this.apiUrl}/lugares`)
      .subscribe({
        next: respuesta => {

  console.log('LUGARES RECIBIDOS:', respuesta);
  console.log('ES ARRAY:', Array.isArray(respuesta));

  this.lugares = respuesta;
  this.cargandoLugares = false;

  console.log(
    'CARGANDO DESPUÉS:',
    this.cargandoLugares
  );

  console.log(
    'LUGARES EN COMPONENTE:',
    this.lugares
  );

  this.cdr.detectChanges();
},

        error: error => {

  console.error(error);

  this.cargandoLugares = false;

  this.error =
    error?.error?.mensaje ??
    'No se pudieron cargar los lugares.';

  this.cdr.detectChanges();
}
      });
  }

  buscarViajes(): void {

    this.mensaje = '';
    this.error = '';
    this.viajes = [];

    if (!this.origenLugarId) {
      this.error = 'Seleccione el origen.';
      return;
    }

    if (!this.destinoLugarId) {
      this.error = 'Seleccione el destino.';
      return;
    }

    if (this.origenLugarId === this.destinoLugarId) {
      this.error =
        'El origen y destino no pueden ser iguales.';
      return;
    }

    if (!this.fecha) {
      this.error = 'Seleccione la fecha del viaje.';
      return;
    }

    this.cargandoViajes = true;

    const params = {
      origenLugarId: this.origenLugarId,
      destinoLugarId: this.destinoLugarId,
      fecha: this.fecha
    };

    this.http
      .get<Viaje[]>(
        `${this.apiUrl}/viajes`,
        { params }
      )
      .subscribe({
        next: respuesta => {
          this.viajes = respuesta;
          this.cargandoViajes = false;

          if (respuesta.length === 0) {
            this.mensaje =
              'No existen viajes disponibles para los datos seleccionados.';
          } else {
            this.mensaje =
              `${respuesta.length} viaje(s) encontrado(s).`;
          }
        },

        error: error => {
          console.error(error);

          this.viajes = [];
          this.cargandoViajes = false;

          this.error =
            error?.error?.mensaje ??
            'No se pudieron consultar los viajes.';
        }
      });
  }

  obtenerHora(fecha: string): string {
    return new Date(fecha).toLocaleTimeString(
      'es-EC',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }

  obtenerNombreLugar(id: number): string {

    const lugar = this.lugares.find(
      l => l.lugarId === id
    );

    return lugar?.nombre ?? '';
  }
}