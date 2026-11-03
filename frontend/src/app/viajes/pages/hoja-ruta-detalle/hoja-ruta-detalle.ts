import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { mensajeError } from '../../../shared/http-error';
import { HojaRuta } from '../../models/hoja-ruta.model';
import { HojasRutaApiService } from '../../services/hojas-ruta-api.service';
import { ViajesApiService } from '../../services/viajes-api.service';

@Component({
  selector: 'app-hoja-ruta-detalle', standalone: true, imports: [FormsModule, RouterLink],
  templateUrl: './hoja-ruta-detalle.html'
})
export class HojaRutaDetalleVista implements OnInit {
  private readonly api = inject(HojasRutaApiService);
  private readonly viajesApi = inject(ViajesApiService);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  readonly hoja = signal<HojaRuta | null>(null);
  readonly error = signal('');
  readonly aviso = signal('');
  sustituyendoId: number | null = null;
  reemplazo = { busReemplazoId: null as number | null, observacion: '' };

  ngOnInit(): void {
    this.api.obtener(this.id).subscribe({
      next: h => this.hoja.set(h), error: e => this.error.set(mensajeError(e))
    });
  }

  publicar(): void { this.actualizar(this.api.publicar(this.id), 'Hoja publicada.'); }
  cerrar(): void { this.actualizar(this.api.cerrar(this.id), 'Hoja cerrada.'); }
   generarViajes(): void {
    this.error.set(''); 
    this.aviso.set('');
    this.viajesApi.generarDesdeHoja(this.id).subscribe({
      next: v => this.aviso.set(`Se generaron ${v.length} viaje(s).`), 
      error: e => {
        // Esto te dirá exactamente qué está fallando
        console.error('Error del backend:', e);
        this.error.set(mensajeError(e));
      }
    });
  }
  iniciarSustitucion(detalleId: number): void { this.sustituyendoId = detalleId; this.reemplazo = { busReemplazoId: null, observacion: '' }; }
  sustituir(): void {
    if (this.sustituyendoId === null || !this.reemplazo.busReemplazoId || !this.reemplazo.observacion.trim()) {
      this.error.set('Indica el bus de reemplazo y una observación.'); return;
    }
    this.actualizar(this.api.sustituirBus(this.id, this.sustituyendoId, {
      busReemplazoId: this.reemplazo.busReemplazoId, observacion: this.reemplazo.observacion.trim()
    }), 'Bus sustituido.');
  }
  private actualizar(accion: Observable<HojaRuta>, ok: string): void {
    this.error.set(''); this.aviso.set('');
    accion.subscribe({
      next: h => { this.hoja.set(h); this.sustituyendoId = null; this.aviso.set(ok); },
      error: e => this.error.set(mensajeError(e))
    });
  }
}