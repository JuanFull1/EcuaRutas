import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { mensajeError } from '../../../shared/http-error';
import { HojaRutaResumen } from '../../models/hoja-ruta.model';
import { HojasRutaApiService } from '../../services/hojas-ruta-api.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-hojas-ruta-lista',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './hojas-ruta-lista.html'
})
export class HojasRutaLista implements OnInit {
  private readonly api = inject(HojasRutaApiService);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly hojas = signal<HojaRutaResumen[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');
  
  grupos: any[] = [];
  
  grupoBusId: number | null = null;
  desde = '';
  hasta = '';
  auto = { grupoBusId: null as number | null, fechaInicio: '', fechaFin: '', frecuencias: '' };

  ngOnInit(): void { 
    this.cargarGrupos();
    this.cargar(); 
  }

  cargarGrupos(): void {
    const cooperativaId = this.authService.usuarioActual()?.cooperativaId;
    if (!cooperativaId) return;
    const params = new HttpParams().set('cooperativaId', cooperativaId);
    
    this.http.get<any[]>('http://localhost:5268/api/grupos-buses', { params }).subscribe({
      next: res => { 
        this.grupos = res; 
        this.cdr.detectChanges(); 
      },
      error: (e) => console.error('Error grupos:', e)
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.listar({ grupoBusId: this.grupoBusId, desde: this.desde, hasta: this.hasta }).subscribe({
      next: hojas => { this.hojas.set(hojas); this.cargando.set(false); },
      error: e => { this.error.set(mensajeError(e)); this.cargando.set(false); }
    });
  }

  publicar(id: number): void { this.ejecutar(this.api.publicar(id), 'Hoja publicada.'); }
  cerrar(id: number): void { this.ejecutar(this.api.cerrar(id), 'Hoja cerrada.'); }

  generarAutomatica(): void {
    const ids = this.auto.frecuencias.split(',').map(s => Number(s.trim())).filter(n => Number.isInteger(n) && n > 0);
    if (!this.auto.grupoBusId || !this.auto.fechaInicio || !this.auto.fechaFin || ids.length === 0) {
      this.error.set('Completa el grupo, las fechas y al menos una frecuencia.');
      return;
    }
    this.ejecutar(
      this.api.generarAutomatica({
        grupoBusId: this.auto.grupoBusId, fechaInicio: this.auto.fechaInicio, fechaFin: this.auto.fechaFin,
        frecuencias: ids.map(frecuenciaId => ({ frecuenciaId }))
      }),
      'Hojas generadas en estado BORRADOR.'
    );
  }

  private ejecutar(accion: Observable<unknown>, ok: string): void {
    this.error.set(''); this.aviso.set('');
    accion.subscribe({
      next: () => { this.aviso.set(ok); this.cargar(); },
      error: e => this.error.set(mensajeError(e))
    });
  }
}